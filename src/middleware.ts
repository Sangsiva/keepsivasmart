import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isProtected = ['/dashboard', '/learning-hub', '/settings'].some(path => req.nextUrl.pathname.startsWith(path));
  
  if (isProtected && !req.auth) {
    const newUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    return NextResponse.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
