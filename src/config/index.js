const rutasEmpresa = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'create-payment-intent', 'diagnostico-de-negocio', 'ficha-cliente', 'addficha', 'eliminarficha', 'acuerdo-de-confidencialidad', 'analisis-de-negocio', 'guardar-archivos-analisis', 'plan-empresarial', 'proyecto-de-consultoria', 'plan-estrategico', 'editartarea', 'pagar-diagnostico', 'pagar-analisis', 'pagar-analisis-per1','pagar-analisis-per2', 'pagar-analisis-per3', 'pagar-empresarial', 'pagar-empresarial-per1','pagar-empresarial-per2', 'pagar-empresarial-per3', , 'pagar-plan-estrategico', 'pago-cancelado', 'pago-exitoso' ]

const rutasConsultor = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'comentariotareas', 'empresas', 'empresas-asignadas', 'enviar-propuesta-empresa', 'analisis-dimension-producto', 'analisis-dimension-administracion', 'analisis-dimension-operaciones', 'analisis-dimension-marketing', 'agregartarea', 'editartarea', 'actualizartarea', 'eliminartarea', 'nuevorendimiento', 'cuestionario-diagnostico', 'diagnostico-proyecto', 'guardarinforme', 'conclusiones', 'guardar-archivos-empresarial', 'website-empresarial', 'finalizaretapa', 'solicitar-archivos-empresa', 'eliminar-archivos-empresa']

const rutasAdmin = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'consultores', 'actualizarconsultor', 'bloquearconsultor', 'empresas', 'actualizarempresa', 'bloquearempresa', 'pagomanual-diagnostico', 'pagomanual-empresas', 'cancelarsub']

const privateKey_DKIM = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA7xNzJ731XqyyDHzYP0WhrtztESwlP9jTW6jHqri4hB2Jjpcf
+h/VZosi0zmnxkCNABLZM6xIrIj4FhqJJnwdKsAYyO4aYnkuiluDy65xbrTnvSCD
VmqxZUrsu11aWuHmrlNWABfi/9x77qapUlPsZMtGbO6SKwbs8s44Vg4262QRVqqe
X2crzXT2wjMdp84rFIwokQ5OyXlqf0UreGIlyMkX5xhWTT9G+1AVaKN/+CDdRBrO
v6ZniLIyq8iogvAL++Ge04zvEoCF1lyD7teQa6ZaIcm0ajVWBOoSPqf059mzku5t
L1o4djf17+tltFK/OuP94cOWF2QeN0W2hBbg9wIDAQABAoIBAEg+fGHaCTeev/7+
Cuqzw/PvVsQFrwvoHZZpHkz8nOVvd43bJRKUZAwkp1Vk6soB35nSGEiBG0Tn7u/e
/OrgPoAYpGSzbs2rCOFOXjlCcYyephiEpquKeii9x2OnBhLIiMjM7gQBM9tVaS3o
tunl6l1a/+ETBqBx61BD+MooaXgfo4YMwPXSudrpoLPdQX2X6/IAYje2ky6QzO/G
U6ocopk3lusz8FEsqmjcPSfI+2meYXp3HjhYOOMeaqllnkIsh9Ge5sJaPKQFis3/
U969fC7UjTF1juWTAb22LCmYf9pT/J8Sl1KwsGeVJv71Jz8PeF059iPDX2NqvnKy
3fya7EECgYEA+qBbyiraNnFtNM4UP2XBpIJblR0oXS8FxXvfoLjNhbyeZ8w0h5D0
I3eIl4MYdHUYdxBaWq/K0b28oN5lkXB1SnsiU+JcYv6g+o5wxCtQ5fkIwELKZW5O
i72obsQYLMqXS19WnuwJxMFk/udh4neMmHXY3u7ugrTHgJMXRcP+30kCgYEA9DOx
ckqHsEIUiL8lx4Wcgk5l4f52RYIzlh1CcLv1DI5WBDIe91zUh2R2Y7uU0/H45h0Y
tTgoTU75vBnOVZabGTivQj08w1KrLim/kUCwxN2jmUa8tKaPkdtltKX8mwqLLAbt
thlugVp46QT3q9MM5MhtD8a0+hCGkIp3Voq4fj8CgYEAonG5zOnFkjAmpmlEOmtL
/cL4dUf2158Y0I2fvt7JZ3t/+KslCRFtDGf3wqyX9zPGbbXNuqXigdvHHUXI82G+
xE3XTCOV2hxMXtpgQOYKg2TMxUEFSoUap/x/5Xt4Z9/P/GyJCmzXUA5B1e5HRbBT
EqafsK+RLGrcPHwaQ3/r/PECgYBuWq3lqCiJTlNZOIgqEgcYG7WO2x83ag9F1xMf
PtEOS4QzgTLdNeYVCSE3EJ3A6ahA1QVFX4tW5EmW51KG+vg7/ZG1rVa4LbONuPAJ
A+LeFArKSV0dhed7UlozuI7ewXUDAF6L3BJEAk6Bfu0tiMJa4PfoGTPPjYhB6VDk
muukoQKBgEY8XNvGvyQAt8RUZI2LH/PdQzxQO7P903+N7y2QdZG8vboytBFcV5Fb
T6sbyBiyyGuyysjOQ6PsbRx/xGHbtjLR6FZFBskR15DFMrezyAj6PfJ+x81AloBp
VoLk1z49j21A1PcNYoTnM8KWKZgLHgjgAvMP2GwJ8dJdnTDU1UcG
-----END RSA PRIVATE KEY-----`

module.exports = {
  rutasEmpresa, rutasConsultor, rutasAdmin,
  privateKey_DKIM
};