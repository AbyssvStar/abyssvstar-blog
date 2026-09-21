rootProject.name = "abyssvstar-blog"

pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        maven("https://maven.aliyun.com/repository/public")
    }

    // 把插件 id 直接映射到它的实现模块，跳过 Gradle 插件标记（*.gradle.plugin）解析。
    // 这样在无网络 / 缓存里没有标记的情况下也能构建；有网络时保留这段也完全无害。
    resolutionStrategy {
        eachPlugin {
            when (requested.id.id) {
                "org.springframework.boot" ->
                    useModule("org.springframework.boot:spring-boot-gradle-plugin:${requested.version}")
                "org.jetbrains.kotlin.jvm" ->
                    useModule("org.jetbrains.kotlin:kotlin-gradle-plugin:${requested.version}")
                "org.jetbrains.kotlin.plugin.spring" ->
                    useModule("org.jetbrains.kotlin:kotlin-allopen:${requested.version}")
            }
        }
    }
}
