"""
SnapshotTargetProvider 单元测试
"""

import pytest
from unittest.mock import Mock, patch

from apps.scan.providers import SnapshotTargetProvider, ProviderContext


class TestSnapshotTargetProvider:
    """SnapshotTargetProvider 测试类"""

    def test_init_with_scan_id(self):
        """测试初始化"""
        provider = SnapshotTargetProvider(scan_id=100)

        assert provider.scan_id == 100
        assert provider.target_id is None

    def test_init_with_context(self):
        """测试带 context 初始化"""
        ctx = ProviderContext(target_id=1, scan_id=100)
        provider = SnapshotTargetProvider(scan_id=100, context=ctx)

        assert provider.scan_id == 100
        assert provider.target_id == 1

    @patch('apps.asset.services.snapshot.SubdomainSnapshotsService')
    def test_iter_subdomains(self, mock_service_class):
        """测试从子域名快照迭代子域名"""
        mock_service = Mock()
        mock_service.iter_subdomain_names_by_scan.return_value = iter([
            "a.example.com",
            "b.example.com"
        ])
        mock_service_class.return_value = mock_service

        provider = SnapshotTargetProvider(scan_id=100)
        subdomains = list(provider.iter_subdomains())

        assert subdomains == ["a.example.com", "b.example.com"]
        mock_service.iter_subdomain_names_by_scan.assert_called_once_with(
            scan_id=100,
            chunk_size=1000
        )

    @patch('apps.asset.services.snapshot.HostPortMappingSnapshotsService')
    def test_iter_host_port_urls(self, mock_service_class):
        """测试从主机端口映射快照生成 URL"""
        mock_service = Mock()
        mock_service.iter_unique_host_ports_by_scan.return_value = iter([
            {'host': 'example.com', 'port': 80},
            {'host': 'example.com', 'port': 443},
            {'host': 'example.com', 'port': 8080},
        ])
        mock_service_class.return_value = mock_service

        provider = SnapshotTargetProvider(scan_id=100)
        urls = list(provider.iter_host_port_urls())

        assert urls == [
            "http://example.com",
            "https://example.com",
            "http://example.com:8080",
            "https://example.com:8080",
        ]

    @patch('apps.asset.services.snapshot.WebsiteSnapshotsService')
    def test_iter_websites(self, mock_service_class):
        """测试从网站快照迭代 URL"""
        mock_service = Mock()
        mock_service.iter_website_urls_by_scan.return_value = iter([
            "http://example.com",
            "https://example.com"
        ])
        mock_service_class.return_value = mock_service

        provider = SnapshotTargetProvider(scan_id=100)
        urls = list(provider.iter_websites())

        assert urls == ["http://example.com", "https://example.com"]
        mock_service.iter_website_urls_by_scan.assert_called_once_with(
            scan_id=100,
            chunk_size=1000
        )

    @patch('apps.asset.services.snapshot.EndpointSnapshotsService')
    def test_iter_endpoints(self, mock_service_class):
        """测试从端点快照迭代 URL"""
        mock_endpoint1 = Mock()
        mock_endpoint1.url = "http://example.com/api/v1"

        mock_endpoint2 = Mock()
        mock_endpoint2.url = "http://example.com/api/v2"

        mock_queryset = Mock()
        mock_queryset.iterator.return_value = iter([mock_endpoint1, mock_endpoint2])

        mock_service = Mock()
        mock_service.get_by_scan.return_value = mock_queryset
        mock_service_class.return_value = mock_service

        provider = SnapshotTargetProvider(scan_id=100)
        urls = list(provider.iter_endpoints())

        assert urls == ["http://example.com/api/v1", "http://example.com/api/v2"]
        mock_service.get_by_scan.assert_called_once_with(scan_id=100)

    def test_get_blacklist_filter(self):
        """测试黑名单过滤器（快照模式不使用黑名单）"""
        provider = SnapshotTargetProvider(scan_id=100)
        assert provider.get_blacklist_filter() is None

    def test_context_propagation(self):
        """测试上下文传递"""
        ctx = ProviderContext(target_id=456, scan_id=789)
        provider = SnapshotTargetProvider(scan_id=100, context=ctx)

        assert provider.target_id == 456
        assert provider.scan_id == 100
