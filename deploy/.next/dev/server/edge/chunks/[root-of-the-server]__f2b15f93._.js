(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
function middleware(request) {
    const { pathname, searchParams } = request.nextUrl;
    // Eğer root path (/) ve code parametresi varsa
    if (pathname === '/') {
        const code = searchParams.get('code');
        const table = searchParams.get('table');
        if (code) {
            // 🔒 GÜVENLİK: Masa kodunu cookie'ye kaydet ve URL'den gizle
            const url = request.nextUrl.clone();
            url.pathname = `/${code}`;
            // code parametresini kaldır
            url.searchParams.delete('code');
            // table parametresini cookie'ye kaydet ve URL'den kaldır
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(url);
            if (table) {
                // 🔒 Yeni masa kodu geldiğinde eski cookie'yi sil ve yenisini yaz
                // Bu şekilde farklı müşteriler karışmaz
                response.cookies.set('tableCode', table, {
                    httpOnly: false,
                    secure: ("TURBOPACK compile-time value", "development") === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 20,
                    path: '/'
                });
                // Table parametresini URL'den kaldır (kullanıcı görmeyecek)
                url.searchParams.delete('table');
            } else {
                // Table parametresi yoksa eski cookie'yi temizle
                // (Başka bir QR kod okutulmuş olabilir)
                const existingCookie = request.cookies.get('tableCode');
                if (existingCookie) {
                    response.cookies.delete('tableCode');
                }
            }
            return response;
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: '/'
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map