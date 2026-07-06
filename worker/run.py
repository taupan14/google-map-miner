"""
Entrypoint alternatif — jalankan dari dalam folder worker/:
    python run.py
    python run.py --job-id <uuid>
"""
import sys
import os

# Tambahkan parent directory ke sys.path
# Sehingga `import worker.xxx` bisa resolve dengan benar
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from worker.main import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())