"""Test settings.

All domain tables are ``managed = False`` (owned by Flyway), so Django's test
runner would create an EMPTY test database. Instead we point the test database
at the real ``psychosim`` schema and rely on per-test transaction rollback
(the ``django_db`` marker) for isolation. Run pytest with ``--reuse-db
--nomigrations`` (see pytest.ini) so the existing schema is never recreated.

Never use ``transactional_db`` / ``TransactionTestCase`` here — those truncate
tables and WOULD be destructive against the shared dev database.
"""
from .local import *  # noqa

DATABASES["default"]["TEST"] = {"NAME": "psychosim"}  # noqa: F405
