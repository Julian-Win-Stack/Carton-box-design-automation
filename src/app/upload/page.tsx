export default function UploadPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Upload a design photo</h1>
      <form
        action="/api/uploads"
        method="post"
        encType="multipart/form-data"
        className="flex flex-col items-center gap-4"
      >
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm text-gray-300"
        />
        <button
          type="submit"
          className="rounded bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
        >
          Upload
        </button>
      </form>
    </main>
  );
}
