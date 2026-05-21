export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/withdrawals/:path*",
    "/players/:path*",
    "/economy/:path*",
    "/fraud/:path*",
    "/treasury/:path*",
    "/settings/:path*",
  ],
};
