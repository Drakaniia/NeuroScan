import { DefinitionList } from "@/components/ui/feedback";
import type { ImageItem } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";

const LABELS: Record<string, string> = {
  format: "Format",
  modality: "Modality",
  bodyPartExamined: "Body part",
  studyDescription: "Study description",
  seriesDescription: "Series description",
  protocolName: "Protocol",
  studyDate: "Study date",
  seriesNumber: "Series",
  instanceNumber: "Instance",
  sliceLocation: "Slice location",
  sliceThickness: "Slice thickness",
  pixelSpacing: "Pixel spacing",
  patientName: "DICOM patient name",
  patientId: "DICOM patient ID",
  patientSex: "DICOM patient sex",
  patientBirthDate: "DICOM birth date",
  institutionName: "Institution",
  manufacturer: "Manufacturer",
  manufacturerModelName: "Scanner model",
  magneticFieldStrength: "Field strength (T)",
  repetitionTime: "TR (ms)",
  echoTime: "TE (ms)",
  photometricInterpretation: "Photometric",
  bitsStored: "Bits stored",
  transferSyntax: "Transfer syntax",
  sopClassUid: "SOP class UID",
  studyInstanceUid: "Study instance UID",
  seriesInstanceUid: "Series instance UID",
  sopInstanceUid: "SOP instance UID",
  colorType: "Colour type",
  bitDepth: "Bit depth",
  columns: "Columns",
  rows: "Rows",
};

const ORDER = Object.keys(LABELS);

/** Facts about the selected image: file, pixels and (for DICOM) header tags. */
export function ImageInfoPanel({ image }: { image: ImageItem }) {
  const metadata = Object.entries(image.metadata ?? {})
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .sort(([a], [b]) => {
      const ia = ORDER.indexOf(a);
      const ib = ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  return (
    <div className="space-y-5 p-4">
      <section>
        <h3 className="type-headline mb-2.5 text-ink">File</h3>
        <DefinitionList
          className="rounded-xl bg-surface-muted p-3.5 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]"
          items={[
            { label: "Original name", value: image.originalName },
            { label: "Format", value: image.format.toUpperCase() },
            {
              label: "Dimensions",
              value: `${image.width} × ${image.height} px`,
            },
            {
              label: "Frame",
              value:
                image.frameCount > 1
                  ? `${image.frameIndex + 1} of ${image.frameCount}`
                  : "Single frame",
            },
            { label: "File size", value: formatBytes(image.fileSize) },
            { label: "Bits stored", value: image.bitsStored ?? "—" },
            {
              label: "Value range",
              value: `${Math.round(image.valueMin)} – ${Math.round(image.valueMax)}`,
            },
            {
              label: "Default window",
              value: `L ${Math.round(image.windowCenter)} / W ${Math.round(image.windowWidth)}`,
            },
            { label: "Imported", value: formatDateTime(image.importedAt) },
            { label: "Imported by", value: image.importedByName ?? "—" },
            { label: "SHA-256", value: image.sha256, mono: true },
          ]}
        />
      </section>
      {metadata.length > 0 ? (
        <section>
          <h3 className="type-headline mb-2.5 text-ink">
            {image.format === "dicom" ? "DICOM attributes" : "Image attributes"}
          </h3>
          <DefinitionList
            className="rounded-xl bg-surface-muted p-3.5 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]"
            items={metadata.map(([key, value]) => ({
              label: LABELS[key] ?? key,
              value: String(value),
              mono: /Uid$|transferSyntax/.test(key),
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
