package com.abyssvstar.blog.shared.web

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

/**
 * 给每个请求一个 traceId：写进 MDC，并回写到响应头。
 * 出问题时用户看到的只是 500，靠响应头里的 X-Trace-Id 去日志里捞。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class TraceIdFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val traceId = sanitize(request.getHeader(HEADER)) ?: newTraceId()
        MDC.put(MDC_KEY, traceId)
        response.setHeader(HEADER, traceId)
        try {
            filterChain.doFilter(request, response)
        } finally {
            MDC.remove(MDC_KEY)
        }
    }

    /** 只接受自己生成的短 token，避免把外部输入原样写进日志 */
    private fun sanitize(candidate: String?): String? =
        candidate?.takeIf { it.length in 8..64 && it.all { c -> c.isLetterOrDigit() || c == '-' } }

    private fun newTraceId(): String = UUID.randomUUID().toString().replace("-", "").substring(0, 16)

    companion object {
        const val HEADER = "X-Trace-Id"
        const val MDC_KEY = "traceId"
    }
}
