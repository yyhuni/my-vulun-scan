"""Common utilities"""

from .dedup import deduplicate_for_bulk, get_unique_fields
from .hash import (
    calc_file_sha256,
    calc_stream_sha256,
    safe_calc_file_sha256,
    is_file_hash_match,
)
from .csv_utils import (
    generate_csv_rows,
    format_list_field,
    format_datetime,
    UTF8_BOM,
)

__all__ = [
    'deduplicate_for_bulk',
    'get_unique_fields',
    'calc_file_sha256',
    'calc_stream_sha256',
    'safe_calc_file_sha256',
    'is_file_hash_match',
    'generate_csv_rows',
    'format_list_field',
    'format_datetime',
    'UTF8_BOM',
]
