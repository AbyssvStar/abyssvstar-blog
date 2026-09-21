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

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // 密码哈希：只用到 spring-security-crypto（BCrypt），不引入整个 Spring Security
    implementation("org.springframework.security:spring-security-crypto")

    // 数据库迁移
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // 上下文装配测试只需要一个能用的 DataSource；迁移在测试里关掉，
    // 因为 V1–V8 是 PostgreSQL 专用的（jsonb / timestamptz / GIN / pg_trgm）。
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
