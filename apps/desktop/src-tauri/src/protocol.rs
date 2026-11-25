//! `neuroscan://` — pixel data for the webview.
//!
//! Routes (on Windows the webview addresses them as `https://neuroscan.localhost/…`):
//!
//! - `/thumb/<image>` — the PNG thumbnail written at import;
//! - `/frame/<image>` — the frame's grayscale values as little-endian `f32`,
//!   which the viewer windows interactively on a canvas;
//! - `/render/<image>?c=<centre>&w=<width>&invert=<0|1>` — an 8-bit PNG
//!   rendering (reports, printing, annotated export).
//!
//! Every request requires an unlocked session whose role may view
//! examinations, and responses are marked `no-store` so patient images are not
//! left in the webview's disk cache.

use tauri::http::{Request as HttpRequest, Response as HttpResponse, ResponseBuilder};
use tauri::{AppHandle, Manager};

use crate::auth::Permission;
use crate::imaging::{self, decode};
use crate::state::AppState;

type ProtocolResult = Result<HttpResponse, Box<dyn std::error::Error>>;

fn respond(status: u16, mime: &str, body: Vec<u8>) -> ProtocolResult {
    ResponseBuilder::new()
        .status(status)
        .mimetype(mime)
        .header("Cache-Control", "no-store")
        .header("Access-Control-Allow-Origin", "*")
        .header("X-Content-Type-Options", "nosniff")
        .body(body)
}

fn text(status: u16, message: &str) -> ProtocolResult {
    respond(
        status,
        "text/plain; charset=utf-8",
        message.as_bytes().to_vec(),
    )
}

/// Path and query of `scheme://host/path?query`, whatever form the platform
/// hands over.
fn split_uri(uri: &str) -> (String, String) {
    let without_scheme = uri.split_once("://").map(|(_, rest)| rest).unwrap_or(uri);
    let path_and_query = without_scheme
        .find('/')
        .map(|index| &without_scheme[index..])
        .unwrap_or("/");
    match path_and_query.split_once('?') {
        Some((path, query)) => (path.to_string(), query.to_string()),
        None => (path_and_query.to_string(), String::new()),
    }
}

fn query_value<'a>(query: &'a str, key: &str) -> Option<&'a str> {
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find(|(name, _)| *name == key)
        .map(|(_, value)| value)
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.chars().all(|ch| ch.is_ascii_hexdigit() || ch == '-')
}

pub fn handle(app: &AppHandle, request: &HttpRequest) -> ProtocolResult {
    if request.method() == "OPTIONS" {
        return respond(204, "text/plain", Vec::new());
    }
    let state = app.state::<AppState>();
    let allowed = state
        .sessions
        .peek()
        .map(|user| user.role.allows(Permission::ExamRead))
        .unwrap_or(false);
    if !allowed {
        return text(401, "Sign in to view images.");
    }

    let (path, query) = split_uri(request.uri());
    let segments: Vec<&str> = path.trim_matches('/').split('/').collect();
    let (route, id) = match segments.as_slice() {
        [route, id] if valid_id(id) => (*route, *id),
        _ => return text(404, "Not found."),
    };
    let data_dir = state.data_dir().to_path_buf();

    match route {
        "thumb" => match std::fs::read(imaging::thumbnail_path(&data_dir, id)) {
            Ok(bytes) => respond(200, "image/png", bytes),
            Err(_) => text(404, "Thumbnail not found."),
        },
        "frame" | "render" => {
            let location = match state.db.with(|conn| imaging::locate(conn, &data_dir, id)) {
                Ok(location) => location,
                Err(_) => return text(404, "Image not found."),
            };
            let frame = match decode::load_gray_frame(
                &location.path,
                location.format,
                location.frame_index,
            ) {
                Ok(frame) => frame,
                Err(error) => {
                    return text(410, &format!("The stored image could not be read: {error}"))
                }
            };
            if route == "frame" {
                return respond(200, "application/octet-stream", frame.to_le_bytes());
            }
            let center = query_value(&query, "c")
                .and_then(|value| value.parse::<f64>().ok())
                .unwrap_or(location.window_center);
            let width = query_value(&query, "w")
                .and_then(|value| value.parse::<f64>().ok())
                .filter(|value| *value > 0.0)
                .unwrap_or(location.window_width);
            let invert = query_value(&query, "invert")
                .map(|value| value == "1")
                .unwrap_or(location.invert);
            match decode::render_gray_image(&frame, center, width, invert)
                .and_then(|gray| decode::encode_png(image::DynamicImage::ImageLuma8(gray)))
            {
                Ok(png) => respond(200, "image/png", png),
                Err(error) => text(500, &error.to_string()),
            }
        }
        _ => text(404, "Not found."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_both_uri_forms() {
        assert_eq!(
            split_uri("https://neuroscan.localhost/frame/abc-1?c=40&w=80"),
            ("/frame/abc-1".to_string(), "c=40&w=80".to_string())
        );
        assert_eq!(
            split_uri("neuroscan://localhost/thumb/abc"),
            ("/thumb/abc".to_string(), String::new())
        );
        assert_eq!(query_value("c=40&w=80", "w"), Some("80"));
        assert_eq!(query_value("c=40", "invert"), None);
    }

    #[test]
    fn rejects_path_traversal_ids() {
        assert!(valid_id("0f8b6c1e-2d4a-4c6e-9b1a-3e5f7a9c1d2b"));
        assert!(!valid_id("..\\..\\windows"));
        assert!(!valid_id("a/b"));
        assert!(!valid_id(""));
    }
}
