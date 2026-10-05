# ---- 构建阶段 ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# 先只 copy 构建脚本，让依赖层可被缓存
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle

# git 在 Windows 上检出时会把 gradlew 写成 CRLF，首行的 shebang 就成了 "#!/bin/sh\r"，
# 容器里的 dash 找不到这个解释器，只报一句 "./gradlew: not found"。先把 CR 去掉，
# 这样不管在哪种宿主机上检出，镜像都构建得出来。
RUN sed -i 's/\r$//' gradlew \
 && chmod +x gradlew \
 && ./gradlew --no-daemon --console=plain dependencies --quiet

COPY src ./src
RUN ./gradlew --no-daemon --console=plain bootJar

# ---- 运行阶段 ----
FROM eclipse-temurin:21-jre-alpine

# 应用不往本地磁盘写任何东西：图片进 MinIO，数据进 PG / Redis，日志走 stdout
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /src/build/libs/app.jar /app/app.jar

USER app
EXPOSE 8080

# JVM 参数由 docker-compose 的 JAVA_TOOL_OPTIONS 注入（-Xmx512m / SerialGC）
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
