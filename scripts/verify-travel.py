"""Compatibility entry point: multiple outlets were replaced by instant selling."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('verify-instant-sale.py')), run_name='__main__')
