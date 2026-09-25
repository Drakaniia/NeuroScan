import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Welcome to NeuroScan</h2>
      <p className="text-lg text-gray-600">
        A desktop application for neuroscan analysis using Tauri and TanStack Router.
      </p>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Install dependencies: <code className="bg-gray-100 px-2 py-1 rounded">bun install</code></li>
          <li>Run dev server: <code className="bg-gray-100 px-2 py-1 rounded">bun run tauri dev</code></li>
          <li>Build for production: <code className="bg-gray-100 px-2 py-1 rounded">bun run tauri build</code></li>
        </ul>
      </div>
    </div>
  ),
});
