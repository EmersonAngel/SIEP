"""CustomUser mapped to the existing Flyway-owned ``users`` table.

The table has exactly these columns: id, email, password_hash, nombre,
apellido, role, activo, created_at. It has NO ``last_login`` / ``is_superuser``
/ group / permission columns, so we inherit only ``AbstractBaseUser`` (which
gives password handling + the auth interface) and drop the inherited
``last_login`` field. ``managed = False`` keeps Django out of the schema.

Passwords are BCrypt ($2b$, 10 rounds) to stay byte-compatible with Spring's
``BCryptPasswordEncoder`` — both directions (verify seeded users, write new ones
Spring can read).
"""
import bcrypt
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN"
    PROFESOR = "PROFESOR"
    ESTUDIANTE = "ESTUDIANTE"


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email required")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("role", UserRole.ADMIN)
        return self.create_user(email, password, **extra)

    def get_by_natural_key(self, username):
        return self.get(**{self.model.USERNAME_FIELD: username})


class CustomUser(AbstractBaseUser):
    id = models.BigAutoField(primary_key=True)
    # AbstractBaseUser declares ``password``; remap it to the real column.
    password = models.CharField(max_length=255, db_column="password_hash")
    # The users table has no ``last_login`` column — remove the inherited field.
    last_login = None

    email = models.EmailField(unique=True, max_length=255)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    role = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.ESTUDIANTE
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre", "apellido"]

    objects = CustomUserManager()

    class Meta:
        db_table = "users"
        managed = False

    def __str__(self):
        return f"{self.nombre} {self.apellido} <{self.email}>"

    # --- Auth interface ---------------------------------------------------
    @property
    def is_active(self):
        return self.activo

    @is_active.setter
    def is_active(self, value):
        self.activo = value

    def set_password(self, raw_password):
        """Store a raw BCrypt hash ($2b$, 10 rounds), Spring-compatible."""
        if raw_password is None:
            self.password = "!"  # unusable
            self._password = None
            return
        hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt(rounds=10))
        self.password = hashed.decode("utf-8")
        self._password = raw_password

    def check_password(self, raw_password):
        """Verify against BCrypt hashes (seeded by Spring) or fall back."""
        if not self.password or raw_password is None:
            return False
        if self.password.startswith("$2"):
            try:
                return bcrypt.checkpw(
                    raw_password.encode("utf-8"), self.password.encode("utf-8")
                )
            except (ValueError, TypeError):
                return False
        return super().check_password(raw_password)

    def has_usable_password(self):
        return bool(self.password) and self.password != "!"


class AccessRequestStatus(models.TextChoices):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    DISMISSED = "DISMISSED"


class AccessRequest(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=AccessRequestStatus.choices,
        default=AccessRequestStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "access_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nombre} {self.apellido} <{self.email}>"
