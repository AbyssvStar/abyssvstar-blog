plugins {
    kotlin("jvm") version "2.1.0"
    kotlin("plugin.spring") version "2.1.0"
    id("org.springframework.boot") version "3.4.5"
}

group = "com.abyssvstar"
version = "0.1.0"
description = "AbyssvStar 的个人站点 —— 数据库即内容事实源，网页后台即写作入口"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories {
    // 国内镜像优先，构建更快；失败会回落到 Maven Central
    maven("https://maven.aliyun.com/repository/public")
    mavenCentral()
}

dependencies {
    // 用 Spring Boot BOM 统一版本，不引入 io.spring.dependency-management 插件
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.4.5"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // AOP：限流切面（@RateLimit）要拦方法调用而不是 HTTP 请求，所以用切面而非拦截器。
    implementation("org.springframework.boot:spring-boot-starter-aop")

    // 持久层：MyBatis-Plus，会传递引入 spring-boot-starter-jdbc；上面那行显式保留只为标明 DataSource 来源。
    implementation("com.baomidou:mybatis-plus-spring-boot3-starter:3.5.7")

    // 对象存储：MinIO 自建图床。图片不落在应用服务器上
    implementation("io.minio:minio:8.5.1")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // Markdown 渲染。预览和发布必须走同一个实例，否则「所见即所得」是假的
    implementation("org.commonmark:commonmark:0.24.0")
    // GFM 扩展。没有表格的话，技术文章里的表格会原样显示成一堆竖线
    implementation("org.commonmark:commonmark-ext-gfm-tables:0.24.0")
    implementation("org.commonmark:commonmark-ext-gfm-strikethrough:0.24.0")
    implementation("org.commonmark:commonmark-ext-autolink:0.24.0")

    // 中文标题转拼音，用来生成 slug。单个 jar，无传递依赖
    implementation("com.belerweb:pinyin4j:2.5.1")

    // 密码哈希：只用到 spring-security-crypto（BCrypt），不引入整个 Spring Security
    implementation("org.springframework.security:spring-security-crypto")

    // 数据库迁移
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // 上下文装配测试只需要一个能用的 DataSource。迁移在测试里关掉，
    // 因为迁移脚本是 PostgreSQL 专用的（jsonb / timestamptz / GIN / pg_trgm）。
    testRuntimeOnly("com.h2database:h2")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName = "app.jar"
}
