const rutasEmpresa = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'create-payment-intent', 'diagnostico-de-negocio', 'ficha-cliente', 'addficha', 'eliminarficha', 'acuerdo-de-confidencialidad', 'analisis-de-negocio', 'guardar-archivos-analisis', 'plan-empresarial', 'proyecto-de-consultoria', 'plan-estrategico', 'editartarea', 'pagar-diagnostico', 'pagar-analisis', 'pagar-analisis-per1','pagar-analisis-per2', 'pagar-analisis-per3', 'pagar-empresarial', 'pagar-empresarial-per1','pagar-empresarial-per2', 'pagar-empresarial-per3', , 'pagar-plan-estrategico', 'pago-cancelado', 'pago-exitoso' ]

const rutasConsultor = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'comentariotareas', 'empresas', 'empresas-asignadas', 'enviar-propuesta-empresa', 'analisis-dimension-producto', 'analisis-dimension-administracion', 'analisis-dimension-operaciones', 'analisis-dimension-marketing', 'agregartarea', 'editartarea', 'actualizartarea', 'eliminartarea', 'nuevorendimiento', 'cuestionario-diagnostico', 'diagnostico-proyecto', 'guardarinforme', 'conclusiones', 'correcciones', 'correcciones-aprobadas', 'guardar-archivos-empresarial', 'website-empresarial', 'finalizaretapa']

const rutasTutor = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'comentariotareas', 'empresas', 'estudiantes-asignados', 'empresas-relacionadas' , 'enviar-propuesta-empresa', 'analisis-dimension-producto', 'analisis-dimension-administracion', 'analisis-dimension-operaciones', 'analisis-dimension-marketing', 'agregartarea', 'editartarea', 'actualizartarea', 'eliminartarea', 'nuevorendimiento', 'cuestionario-diagnostico', 'diagnostico-proyecto', 'guardarinforme', 'conclusiones', 'correcciones', 'correcciones-aprobadas', 'guardar-archivos-empresarial', 'website-empresarial', 'finalizaretapa']

const rutasAdmin = ['logout', 'perfil', 'updateprofile', 'actualizarfotoperfil', 'consultores', 'actualizarconsultor', 'bloquearconsultor', 'eliminarconsultor', 'empresas', 'actualizarempresa', 'bloquearempresa', 'pagomanual-diagnostico', 'pagomanual-empresas', 'cancelarsub']

const privateKey_DKIM = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAxnOodBzxqzPuLrbLtK34c/RwxGDOUcb9R1505XsocKSxuFZS
NKl34bt7MaFfbN4Fn7fYDAwHUyzTPCcE9EbLLOgtaxDdsG9BMKymsezvqYkseWXY
Naq2TMmPZKQ3B0VAxdJrxycxwiWp8fodkn57wS8cuvHQ2NpaCjTOuSvaLigQwsIc
FlAwpo8u1bJmpmDu0YbK2KchnHB8ShesMFETCqwoOqsfjfvp0AaXKXGgA02ZzfYs
1FYOo/rSk8iHmMTh+wMrGqC/zcJJZgwMzxfsHdYSehBLtO2YWTx1s7hWI5G1JJK/
aH8Qwl/29JGUOwksZ9D5/XeeBDrSa4dKHKZL+wIDAQABAoIBAET6EFQDd3BVRXVR
Le6oBVJwZP2s1CmSa5hx2Vml/AFjDS6QOlR5juST4Jb4iw1xAi1onhxZ1fXv/5/J
xCwPqzD5pkevfg6ELPl5GRuAyjB4MFAluQe2RVTdPgzyEvpg9MmNgM6g7eeYZcBo
efzgH62e7XKA+GFXS7J+dlfgSR5/S6IwBtteFrSQ4ug8Ny3MnuZzg983v66YtUyr
Y+QKq1Ftpb77lb3gsAj8vQwqZ9C4KupgnG2ReI9iujmg2XSFzNisp99RWof/En06
VcSFWu11gEHgGLsKkAB4nOsW9GA3e5GoXRET15VZXMc3hxl+gwM7IhIoxxHu3IhE
pg0PyskCgYEA7dvN3GAS0gce8+3HeJB5u/7NclKb2qv0TATnRqmwN6xNHjHj58VB
3SkAOSIKJiHxyzUy/lnH1OR1XJRbj7yA2pBXJCcrnb12gxgFIlIm7bMyaqLIqrtW
8ANxiJJXWR8PGxP37KJ7KOyMEEF70BBFiSHCQ1m2W89xTG0s42nkv/UCgYEA1ZZv
Q55QURh7FMLof3RRwN1flLVW727j9x5gAeo3iaFoqEaB0uFeJ2GNLtniLWmlq4bX
q+ABhOPLtJd97RE9pDLVd+Ld+l2ZKw3KSOR1BIsokHu3Zjrs5pWY95XgtTDhi+Fh
tnheuiM/9QiEHN8lLnykDrNd5awbNdQVWUWIFi8CgYAw0K19DtKN/BwkH6aSXcQ+
CtsLHV0TEbs/Zro4TFb39gqVqdOGG3ua8fEzyIKgtNK0y6Q9gxt527EiYOgxpZQk
Rv87UjanVtzdpq5XDtkia2ZrcCESuQPsmihQyQfYKIGnIv/8tpPkIDfWljncx5od
vKnrvJuqV/Z+ouFVgsQJiQKBgQCMzbNj3EYOcBkTwroK69/JSSbtne5FwdC+5GNe
X81lCec4p+KF5tRvGbw9Gp4kWfVBco9TW0UlGhb8YrI9SpRcXrajZgf4OSP0Yg7s
ps8Nw79mIGjzF/18tTo2XbPZPvQxhs8nv4qTIxHSs16EugaE8t4kYtKPyjnV7o50
X4YrOQKBgDwcLhI0A7o3DCvTw87EzlVfNUKQo7mtWiNnCRoHL3VdOvF+ZXNlaZ//
amtez0n8Pc1ks4+zXw7JBf3+8Xoxvmeyujc1kjqYfLdIU9ggbCiYEPnhloH1bhUU
+UT2qWZD3Vs18MPYvYNCjD4xACnDixfbCzOJPWzLrQHW2IkRe8b5
-----END RSA PRIVATE KEY-----`

module.exports = {
  rutasEmpresa, rutasConsultor, rutasTutor, rutasAdmin, privateKey_DKIM
};