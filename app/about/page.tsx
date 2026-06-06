import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      
      {/* BRAND */}
      <h1 className="text-4xl md:text-5xl font-bold">
        Health Timeline AI
      </h1>

      {/* ONE LINE VALUE */}
      <p className="mt-6 text-lg opacity-70 max-w-2xl">
        Upload your medical reports. Get AI-powered summaries, detect trends over time,
        and prepare better questions for your doctor.
      </p>

      {/* CTA */}
      <div className="mt-10">
        <Link href="/dashboard">
          <button className="px-6 py-3 rounded-lg bg-black text-white">
            Open Dashboard
          </button>
        </Link>
      </div>

      {/* SMALL TRUST LINE */}
      <p className="mt-6 text-sm opacity-50">
        Not a diagnostic tool — designed for understanding and organizing health data.
      </p>

    </main>
  )
}