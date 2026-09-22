package com.abyssvstar.blog.shared.ratelimit

import com.abyssvstar.blog.shared.config.BlogProperties
import com.abyssvstar.blog.shared.util.ClientIp
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.reflect.MethodSignature
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes

/**
 * 限流切面。
 * 抛出的 [BusinessException] 会被 `GlobalExceptionHandler` 统一转成 429 envelope ——
 * 因为切面是在 DispatcherServlet 调 handler 的过程中生效的，异常会正常向上传播到异常解析器。
 */
@Aspect
@Component
class RateLimitAspect(
    private val limiter: RateLimiter,
    private val props: BlogProperties,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Around("@annotation(rateLimit)")
    fun enforce(joinPoint: ProceedingJoinPoint, rateLimit: RateLimit): Any? {
        if (!props.rateLimit.enabled) return joinPoint.proceed()

        val window = RateLimitWindow.parse(rateLimit.window)
        val bucket = bucketOf(joinPoint, rateLimit)

        // 调用前先判有没有超限
        when (rateLimit.countOn) {
            CountOn.ATTEMPT -> if (!limiter.tryAcquire(bucket, rateLimit.limit, window)) {
                log.warn("限流命中 bucket={} limit={}", bucket, rateLimit.limit)
                throw BusinessException(ErrorCode.TOO_MANY_REQUESTS)
            }

            CountOn.FAILURE -> if (limiter.currentCount(bucket) >= rateLimit.limit) {
                log.warn("限流命中（连续失败）bucket={} limit={}", bucket, rateLimit.limit)
                throw BusinessException(ErrorCode.TOO_MANY_REQUESTS)
            }
        }

        return try {
            joinPoint.proceed().also {
                if (rateLimit.countOn == CountOn.FAILURE) limiter.clear(bucket)
            }
        } catch (ex: Throwable) {
            if (rateLimit.countOn == CountOn.FAILURE) limiter.recordFailure(bucket, window)
            throw ex
        }
    }

    /**
     * 计数桶 = `类名.方法名:维度`。
     */
    private fun bucketOf(joinPoint: ProceedingJoinPoint, rateLimit: RateLimit): String {
        val signature = joinPoint.signature as MethodSignature
        val target = "${signature.declaringType.simpleName}.${signature.name}"
        val scope = when (rateLimit.keyBy) {
            KeyBy.GLOBAL -> "global"
            KeyBy.IP -> clientIpHash()
        }
        return "$target:$scope"
    }

    private fun clientIpHash(): String {
        val request = (RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes)?.request
            ?: return NO_REQUEST
        return ClientIp.hash(request, props.security.ipSalt)
    }

    private companion object {
        const val NO_REQUEST = "no-request"
    }
}
