import enum

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class ClientStatus(str, enum.Enum):
    nuevo = "nuevo"
    en_proceso = "en_proceso"
    con_mantenimiento = "con_mantenimiento"
    cerrado = "cerrado"
    perdido = "perdido"


class ComisionTipo(str, enum.Enum):
    monto = "monto"
    porcentaje = "porcentaje"


class PaymentType(str, enum.Enum):
    contado = "contado"
    diferido = "diferido"
    iguala = "iguala"


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    industry = Column(String(120))
    service = Column(String(100))
    source = Column(String(100))
    notes = Column(Text)

    responsable = Column(String(255), nullable=False)
    comisionista = Column(String(255))
    comision_tipo = Column(Enum(ComisionTipo), nullable=True)
    comision_valor = Column(Numeric(12, 2), nullable=True)

    status = Column(Enum(ClientStatus), nullable=False, default=ClientStatus.nuevo)
    payment_type = Column(Enum(PaymentType), nullable=True)
    project_start_date = Column(Date, nullable=True)
    project_amount = Column(Numeric(12, 2), nullable=True)

    converted_from_prospect_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    payments = relationship(
        "ClientPayment",
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="ClientPayment.due_date",
    )


class ClientPayment(Base):
    __tablename__ = "client_payments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    due_date = Column(Date, nullable=False)
    concept = Column(String(255))
    amount = Column(Numeric(12, 2), nullable=False)
    is_paid = Column(Boolean, nullable=False, default=False)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="payments")
