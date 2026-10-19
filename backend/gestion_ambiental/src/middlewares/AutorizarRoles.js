export const AutorizarRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Debes iniciar sesion' })
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: 'No se tiene permiso para realizar esta operacion' })
        }
        next()
    }
}