import Link from 'next/link';

/** Unknown URLs: a page that explains and gives a way back, inside the app shell. */
export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-4">
                <p className="text-5xl font-black text-gray-200 dark:text-gray-800">404</p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Page not found</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    The page you are looking for doesn&apos;t exist or has moved.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                    <Link href="/" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                        Go home
                    </Link>
                    <Link
                        href="/chat"
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Open chat
                    </Link>
                </div>
            </div>
        </div>
    );
}
