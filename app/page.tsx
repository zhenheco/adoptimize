import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          廣告船長
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
          跨平台廣告優化工具 - 整合 Google Ads 和 Meta Marketing API
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            進入儀表板
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            登入
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-4 text-gray-500 text-sm">
        <p>廣告船長 v0.1.0 - Development Build</p>
      </footer>
    </div>
  );
}
