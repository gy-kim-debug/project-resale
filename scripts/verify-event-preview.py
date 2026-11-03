"""Event preview QA entrypoint; includes the expanded variants and reaction flow."""
from pathlib import Path
exec(compile(Path(__file__).with_name('verify-event-depth.py').read_text(), 'verify-event-depth.py', 'exec'))
