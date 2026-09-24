export default function App() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 bg-white px-16 py-32 text-center sm:items-start sm:text-left dark:bg-black">
        <h1 className="max-w-xs text-3xl leading-10 font-semibold tracking-tight text-black dark:text-zinc-50">
          To get started, edit the{' '}
          <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
            src/App.tsx
          </code>{' '}
          file.
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          React + Vite + TypeScript + Tailwind CSS.
        </p>
      </main>
    </div>
  );
}
