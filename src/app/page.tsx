export default function Home() {
  return (
    <main className="h-screen flex flex-col items-center justify-center gap-2">
      <p className="font-semibold text-xl text-gray-700">
        Currently we&apos;re working on this^^
      </p>
      <p className="text-md text-gray-600">
        Read API documentation{" "}
        <a className="underline" href="/api/v1/doc">
          here
        </a>
        !
      </p>
    </main>
  );
}
