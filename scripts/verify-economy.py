"""Economy coverage is shared with the current weekly principal/interest scenarios."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('verify-weekly.py')), run_name='__main__')
