"""Root pytest configuration.

pytest.ini already sets DJANGO_SETTINGS_MODULE; this file is the anchor that
keeps the project root on sys.path so ``apps.*`` and ``psychosim.*`` import.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "psychosim.settings.test")
