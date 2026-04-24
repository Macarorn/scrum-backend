// Modelo de Solicitud de Ingreso a Proyecto
module.exports = (sequelize, DataTypes) => {
  const Solicitud = sequelize.define('Solicitud', {
    id_solicitud: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    id_proyecto: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Cancelada'), allowNull: false, defaultValue: 'Pendiente' },
    motivo: { type: DataTypes.STRING },
    mensaje_opcional: { type: DataTypes.STRING },
    audit_creado_por: { type: DataTypes.INTEGER },
    audit_fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    audit_actualizado_por: { type: DataTypes.INTEGER },
    audit_fecha_actualizacion: { type: DataTypes.DATE }
  }, {
    tableName: 'solicitud',
    timestamps: false
  });
  return Solicitud;
};