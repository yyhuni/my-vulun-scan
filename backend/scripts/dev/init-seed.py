#!/usr/bin/env python
"""
开发种子数据脚本：在空数据库或开发环境中生成一整套假数据。

主要行为：
- 创建一个默认扫描引擎（ScanEngine），如果不存在的话。
- 创建一个组织和一个 Target（默认名称: seed-example.com）。
- 为该 Target 创建 Subdomain / WebSite / Endpoint / Directory / HostPortMapping 等资产数据。
- 创建一条 Scan 记录，并为上述资产生成对应的 Snapshot 记录。

用法示例（在容器 docker-server-1 内）：

    cd /app/backend
    python scripts/dev/init-seed.py
    
一键命令：
    docker exec -it docker-server-1 bash -c "cd /app/backend && python scripts/dev/init-seed.py"


注意：
- 仅用于本地开发/调试，不做任何安全校验。
- 会多次插入随机数据，不保证幂等；如需重置，请清空相关表。
"""

import argparse
import os
import random
import string

import django


def setup_django():
    """初始化 Django 环境，方便作为独立脚本运行。"""
    # 如果在项目根目录外执行，可以通过环境变量覆盖
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    # 确保能够找到项目根目录（/app/backend 已经是 manage.py 所在目录）
    django.setup()


def random_suffix(length: int = 32) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def seed_initial_data(target_name: str = "seed-example.com") -> None:
    """生成一整套种子数据（Target + 资产 + Scan + Snapshots）。"""
    from django.utils import timezone

    from apps.asset.models import (
        Subdomain,
        WebSite,
        Endpoint,
        Directory,
        HostPortMapping,
    )
    from apps.asset.models.snapshot_models import (
        SubdomainSnapshot,
        WebsiteSnapshot,
        DirectorySnapshot,
        HostPortMappingSnapshot,
        EndpointSnapshot,
        VulnerabilitySnapshot,
    )
    from apps.common.definitions import ScanStatus
    from apps.engine.models import ScanEngine
    from apps.scan.models import Scan
    from apps.targets.models import Organization, Target

    print("[seed] 开始生成种子数据...")

    # 1. 扫描引擎：默认引擎
    engine = ScanEngine.objects.filter(is_default=True).first()
    if not engine:
        engine = ScanEngine.objects.create(
            name="Default Engine",
            configuration="",
            is_default=True,
        )
        print(f"[seed] 创建默认扫描引擎: id={engine.id}, name={engine.name}")
    else:
        print(f"[seed] 复用已有默认扫描引擎: id={engine.id}, name={engine.name}")

    # 2. 组织 & Target
    org, _ = Organization.objects.get_or_create(
        name="Seed Organization",
        defaults={"description": "Organization for seeded development data"},
    )

    target, created = Target.objects.get_or_create(
        name=target_name,
        defaults={"type": Target.TargetType.DOMAIN},
    )
    org.targets.add(target)

    if created:
        print(f"[seed] 创建 Target: id={target.id}, name={target.name}")
    else:
        print(f"[seed] 复用已有 Target: id={target.id}, name={target.name}")

    base_domain = target.name or "seed.local"

    # 3. Subdomain 资产
    subdomains = []
    sub_labels = ["www", "api", "admin", "dev", "test"]
    for i in range(5):
        label = f"{sub_labels[i % len(sub_labels)]}{i}"
        name = f"{label}.{base_domain}"
        subdomain, _ = Subdomain.objects.get_or_create(
            target=target,
            name=name,
        )
        subdomains.append(subdomain)
    print(f"[seed] Subdomain 数量: {len(subdomains)}")

    # 4. WebSite 资产
    websites = []
    schemes = ["http", "https"]
    for i in range(3):
        host = f"{sub_labels[i % len(sub_labels)]}.{base_domain}"
        scheme = schemes[i % len(schemes)]
        url = f"{scheme}://{host}/"
        website, _ = WebSite.objects.get_or_create(
            target=target,
            url=url,
            defaults={
                "host": host,
                "title": f"Seed Website {i + 1}",
                "status_code": 200,
                "content_length": 2048 + i * 512,
                "webserver": "nginx/1.24.0 (seed)",
                "body_preview": "Seed website for development UI testing.",
                "content_type": "text/html; charset=utf-8",
                "tech": ["nginx", "django"],
                "vhost": True,
            },
        )
        websites.append(website)
    print(f"[seed] WebSite 数量: {len(websites)}")

    # 5. Endpoint 资产（包含超长 URL，用于前端截断/展开测试）
    endpoints = []
    base_urls = [
        "http://debug-long-url.example.com/very/long/path/",
        "https://api-long.example.com/v1/resources/",
        "https://another-long-host.example.com/some/really/deep/nested/path/",
    ]

    for i in range(10):
        base = random.choice(base_urls)
        long_path = "segment/" * 20
        query = "?token=" + random_suffix(80) + "&q=" + random_suffix(120)
        url = f"{base}{long_path}{i}-{random_suffix(12)}{query}"

        endpoint = Endpoint.objects.create(
            target=target,
            url=url,
            title=f"Fake Endpoint {i + 1} for {base_domain}",
            status_code=200,
            content_type="text/html; charset=utf-8",
            webserver="nginx/1.24.0 (fake test server) " + random_suffix(24),
            body_preview="This is a fake endpoint generated for UI testing.",
            location="",
            tech=["nginx", "django"],
            matched_gf_patterns=["api", "debug"] if i % 2 == 0 else [],
            vhost=True,
        )
        endpoints.append(endpoint)
    print(f"[seed] Endpoint 数量: {len(endpoints)}")

    # 6. Directory 资产（挂在 WebSite 上，同时冗余 Target）
    directories = []
    for i, website in enumerate(websites):
        for depth in range(2):
            url = f"{website.url.rstrip('/')}/dir{depth}/page{i}"
            directory = Directory.objects.create(
                website=website,
                target=target,
                url=url,
                status=200,
                content_length=4096 + i * 256 + depth * 128,
                words=500 + depth * 50,
                lines=80 + depth * 10,
                content_type="text/html; charset=utf-8",
                duration=150_000_000 + depth * 10_000_000,
            )
            directories.append(directory)
    print(f"[seed] Directory 数量: {len(directories)}")

    # 7. HostPortMapping 资产
    host_ports = []
    ports = [80, 443, 8080, 8443]
    for i in range(5):
        host = f"{sub_labels[i % len(sub_labels)]}.{base_domain}"
        ip = f"192.168.0.{10 + i}"
        port = ports[i % len(ports)]
        hpm, _ = HostPortMapping.objects.get_or_create(
            target=target,
            host=host,
            ip=ip,
            port=port,
        )
        host_ports.append(hpm)
    print(f"[seed] HostPortMapping 数量: {len(host_ports)}")

    # 8. 创建一条 Scan 记录
    scan = Scan.objects.create(
        target=target,
        engine=engine,
        status=ScanStatus.COMPLETED,
        results_dir="seed-results",
        flow_run_ids=[],
        flow_run_names=[],
        error_message="",
        progress=100,
        current_stage="completed",
        stage_progress={},
        cached_subdomains_count=len(subdomains),
        cached_websites_count=len(websites),
        cached_endpoints_count=len(endpoints),
        cached_ips_count=len(host_ports),
        cached_directories_count=len(directories),
        stats_updated_at=timezone.now(),
    )

    target.last_scanned_at = timezone.now()
    target.save(update_fields=["last_scanned_at"])

    print(f"[seed] 创建 Scan: id={scan.id}，状态={scan.status}")

    # 9. 为上述资产生成 Snapshot 记录
    for s in subdomains:
        SubdomainSnapshot.objects.create(
            scan=scan,
            name=s.name,
        )

    for w in websites:
        WebsiteSnapshot.objects.create(
            scan=scan,
            url=w.url,
            host=w.host,
            title=w.title,
            status=w.status_code,
            content_length=w.content_length,
            location=w.location,
            web_server=w.webserver,
            content_type=w.content_type,
            tech=w.tech,
            body_preview=w.body_preview,
            vhost=w.vhost,
        )

    for d in directories:
        DirectorySnapshot.objects.create(
            scan=scan,
            url=d.url,
            status=d.status,
            content_length=d.content_length,
            words=d.words,
            lines=d.lines,
            content_type=d.content_type,
            duration=d.duration,
        )

    for h in host_ports:
        HostPortMappingSnapshot.objects.create(
            scan=scan,
            host=h.host,
            ip=h.ip,
            port=h.port,
        )

    for e in endpoints:
        EndpointSnapshot.objects.create(
            scan=scan,
            url=e.url,
            host=e.host,
            title=e.title,
            status_code=e.status_code,
            content_length=e.content_length,
            location=e.location,
            webserver=e.webserver,
            content_type=e.content_type,
            tech=e.tech,
            body_preview=e.body_preview,
            vhost=e.vhost,
            matched_gf_patterns=e.matched_gf_patterns,
        )

    # 10. 漏洞快照
    vulnerabilities_data = [
        {
            "url": "http://vulun.yyhuni.rest/xss/reflected?name=123%27%3E%3Cobject+data%3Djavascript%3Aalert%281%29%3E%3C%2Fobject%3E",
            "vuln_type": "xss",
            "severity": "medium",
            "source": "dalfox",
            "description": "\n".join([
                "Message: Reflected Payload in HTML: name='>\u003cobject data=javascript:alert(1)>\u003c/object>",
                "Type: Reflected",
                "Method: GET",
                "Vulnerable Parameter: name",
                "Inject Type: inHTML-URL",
                "Payload: '>\u003cobject data=javascript:alert(1)>\u003c/object>",
                "Evidence: 32 line:  你好，\u003cstrong>123'>\u003cobject data=javascript:alert(1)>\u003c/object>\u003c/strong>！欢",
                "CWE: CWE-79",
            ]),
            "raw_output": '{"type":"R","inject_type":"inHTML-URL","poc_type":"plain","method":"GET","data":"http://vulun.yyhuni.rest/xss/reflected?name=123%27%3E%3Cobject+data%3Djavascript%3Aalert%281%29%3E%3C%2Fobject%3E","param":"name","payload":"\'>\u003cobject data=javascript:alert(1)>\u003c/object>","evidence":"32 line:  你好，\u003cstrong>123\'>\u003cobject data=javascript:alert(1)>\u003c/object>\u003c/strong>！欢","cwe":"CWE-79","severity":"Medium","message_id":274,"message_str":"Reflected Payload in HTML: name=\'>\u003cobject data=javascript:alert(1)>\u003c/object>"}',
        },
        {
            "url": "http://vulun.yyhuni.rest/xss/reflected?name=123%3E%3Csvg%3E%3Canimate+onbegin%3Dalert%281%29+attributeName%3Dx+dur%3D1s%3E",
            "vuln_type": "xss",
            "severity": "medium",
            "source": "dalfox",
            "description": "\n".join([
                "Message: Reflected Payload in HTML: name=>\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>",
                "Type: Reflected",
                "Method: GET",
                "Vulnerable Parameter: name",
                "Inject Type: inHTML-URL",
                "Payload: >\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>",
                "Evidence: 32 line:  你好，\u003cstrong>123>\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>\u003c/str",
                "CWE: CWE-79",
            ]),
            "raw_output": '{"type":"R","inject_type":"inHTML-URL","poc_type":"plain","method":"GET","data":"http://vulun.yyhuni.rest/xss/reflected?name=123%3E%3Csvg%3E%3Canimate+onbegin%3Dalert%281%29+attributeName%3Dx+dur%3D1s%3E","param":"name","payload":">\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>","evidence":"32 line:  你好，\u003cstrong>123>\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>\u003c/str","cwe":"CWE-79","severity":"Medium","message_id":390,"message_str":"Reflected Payload in HTML: name=>\u003csvg>\u003canimate onbegin=alert(1) attributeName=x dur=1s>"}',
        },
    ]

    for vuln in vulnerabilities_data:
        VulnerabilitySnapshot.objects.create(
            scan=scan,
            url=vuln["url"],
            vuln_type=vuln["vuln_type"],
            severity=vuln["severity"],
            source=vuln["source"],
            description=vuln["description"],
            raw_output=vuln["raw_output"],
        )

    # 更新 Scan 上的缓存漏洞统计字段（种子环境简单按当前插入数据设置）
    scan.cached_vulns_total = len(vulnerabilities_data)
    scan.cached_vulns_critical = 0
    scan.cached_vulns_high = 0
    scan.cached_vulns_medium = len(vulnerabilities_data)
    scan.cached_vulns_low = 0
    scan.save(update_fields=[
        "cached_vulns_total",
        "cached_vulns_critical",
        "cached_vulns_high",
        "cached_vulns_medium",
        "cached_vulns_low",
    ])

    print(f"[seed] VulnerabilitySnapshot 数量: {len(vulnerabilities_data)}")

    print(f"[seed] Snapshot 生成完成。Subdomain/Website/Endpoint/Directory/HostPortMapping/Vulnerability 均已写入。")
    print(f"[seed] 完成。Target id={target.id}, Scan id={scan.id}。")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed initial fake data: target, assets and scan snapshots."
    )
    parser.add_argument(
        "--target-name",
        type=str,
        default="seed-example.com",
        help="要创建或复用的 Target 名称（默认: seed-example.com）",
    )

    args = parser.parse_args()

    setup_django()
    seed_initial_data(target_name=args.target_name)


if __name__ == "__main__":
    main()
