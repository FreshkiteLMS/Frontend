
export const env = {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    COOKIE_EXPIRES: Number(process.env.NEXT_PUBLIC_COOKIE_EXPIRES) || 7,
    RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
};
