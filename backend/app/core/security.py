class SecurityHeadersMiddleware:
    def __init__(self, app, *, content_security_policy: str, x_frame_options: str = "DENY") -> None:
        self.app = app
        self.content_security_policy = content_security_policy
        self.x_frame_options = x_frame_options

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                self._append_header(headers, b"content-security-policy", self.content_security_policy.encode("latin-1"))
                self._append_header(headers, b"x-frame-options", self.x_frame_options.encode("latin-1"))
                self._append_header(headers, b"x-content-type-options", b"nosniff")
                self._append_header(headers, b"referrer-policy", b"strict-origin-when-cross-origin")
                self._append_header(headers, b"permissions-policy", b"geolocation=(), microphone=(), camera=()")
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_security_headers)

    @staticmethod
    def _append_header(headers: list[tuple[bytes, bytes]], name: bytes, value: bytes) -> None:
        if any(header_name == name for header_name, _ in headers):
            return
        headers.append((name, value))
