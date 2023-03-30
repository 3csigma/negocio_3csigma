const tutorController = exports;
const pool = require('../database')
const { consultarDatos, insertarDatos, eliminarDatos } = require('../lib/helpers')

tutorController.index = async (req, res) => {
    const { codigo } = req.user
    const consultores = await consultarDatos('consultores')
    const consultor = consultores.find(x => x.codigo == codigo)

    let estudiante = await pool.query('SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo WHERE rol = "Estudiante" AND c.id_consultores != 1 AND c.tutor_asignado = ?', [consultor.id_tutor])
    let estudiantesAsignados = await consultarDatos('consultores_asignados')
    let tablaEmpresas = await pool.query('SELECT e.*, f.telefono FROM empresas e LEFT OUTER JOIN ficha_cliente f ON e.id_empresas = f.id_empresa INNER JOIN users u ON e.codigo = u.codigo AND rol = "Empresa"')
    let asignados = [], empresas = []
  
    estudiante.forEach(c => {
        asignados = estudiantesAsignados.filter(a => a.consultor == c.id_consultores)
    });
        if (asignados.length > 0) {
            const idEmpresas = asignados.reduce((acc, item) => {
                if (!acc.includes(item.empresa)) acc.push(item.empresa);
                return acc;
            }, [])

            idEmpresas.forEach(x => {
                const info = tablaEmpresas.find(e => e.id_empresas == x)
                if (info) {
                    if (empresas.length < 2) if (info) empresas.push(info);
                }
            });
        }


    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS ASIGANADAS MENSUALMENTE <<====
    // const sss = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    // let suma  = 0
    // const estudiantes = await pool.query("SELECT * FROM consultores WHERE tutor_asignado = ? " , [consultor.id_tutor]);
    // estudiantes.forEach(async (datos) => {
    //     const historialConsultor = await pool.query("SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? " , [datos.id_consultores]);
    //     const row = historialConsultor.filter(x => x.idConsultor == datos.id_consultores)
        
    //     row.forEach(r => {
    //         console.log("Cantidad de empresas >>" , r.num_empresas_asignadas);
    //         suma = suma + r.num_empresas_asignadas
    //         // console.log("suma >>" , suma);

    //     });     
       
    //      console.log("suma >>" , suma);
    // });

    const empresas_asignadas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);

    let datosJson_empresas_asignadas
    if (empresas_asignadas.length > 0) {
        datosJson_empresas_asignadas = JSON.stringify(empresas_asignadas)
    }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    const historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_historialI_consultor
    if (historialInformes.length > 0) {
         datosJson_historialI_consultor = JSON.stringify(historialInformes)
    }
    // FIN DE LA FUNCIÓN <<====

    // ÚLTIMOS INFORMES CARGADOS
    let ultimosInformes = [];
    let ultimos_informes = await consultarDatos('informes', 'ORDER BY id_informes DESC LIMIT 2')
    if (ultimos_informes.length > 0) {
        idEmpresas.forEach(e => {
            ultimosInformes = ultimos_informes.filter(x => x.id_empresa == e)
        })
        ultimosInformes.forEach(x => {
            if (x.nombre == 'Informe diagnóstico') { x.etapa = 'Diagnóstico' }
            if (x.nombre == 'Informe de dimensión producto' || x.nombre == 'Informe de dimensión administración' || x.nombre == 'Informe de dimensión operaciones' || x.nombre == 'Informe de dimensión marketing' || x.nombre == 'Informe de análisis') { x.etapa = 'Análisis' }
            if (x.nombre == 'Informe de plan estratégico') { x.etapa = 'Plan estratégico' }
        })
    }
    res.render('tutor/panelTutor', {
        tutorDash: true, itemActivo: 1, empresas, graficas1: true,
        datosJson_empresas_asignadas, datosJson_historialI_consultor,
        ultimosInformes
    });
}

// ESTUDIANTES ASIGANADOS
tutorController.estudiantesAsignados = async (req, res) => {
    let tutorActual = await consultarDatos('consultores')
    tutorActual = tutorActual.find(x => x.codigo == req.user.codigo)
    
    let consultores = await pool.query('SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo WHERE rol = "Estudiante" AND c.id_consultores != 1 AND c.tutor_asignado = ?', [tutorActual.id_tutor])
    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(distinct empresa) AS numEmpresas FROM consultores_asignados WHERE consultor = ?', [c.id_consultores])
        c.num_empresas = num[0].numEmpresas

        //=> Mostrar el tutor a cargo de estudiantes 
        let tutor = await pool.query('SELECT * FROM consultores c INNER JOIN users u ON c.codigo = u.codigo WHERE u.rol = "Tutor"')
        tutor = tutor.find(x => x.id_tutor == c.tutor_asignado)
        if (tutor) {c.tutor = tutor.nombres + " " + tutor.apellidos} else {c.tutor = "N/A"}
        
    });
    
    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Estudiante" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;
    
    res.render('tutor/estudiantes', { tutorDash: true, itemActivo: 2, consultores, aprobarConsultor })

}

// EMPRESAS ASIGANADAS
tutorController.empresasAsignadas = async (req, res) => {
    let tutorActual = await consultarDatos('consultores')
    tutorActual = tutorActual.find(x => x.codigo == req.user.codigo)

    let consultores = await pool.query('SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo WHERE rol = "Estudiante" AND c.id_consultores != 1 AND c.tutor_asignado = ?', [tutorActual.id_tutor])
    let estudiantesAsignados = await consultarDatos('consultores_asignados')
    let tablaEmpresas = await pool.query('SELECT e.*, f.telefono FROM empresas e LEFT OUTER JOIN ficha_cliente f ON e.id_empresas = f.id_empresa INNER JOIN users u ON e.codigo = u.codigo AND rol = "Empresa"')
    let asignados = [], empresas = []
  
    consultores.forEach(c => {
        asignados = estudiantesAsignados.filter(a => a.consultor == c.id_consultores)
    });
        if (asignados.length > 0) {
            const idEmpresas = asignados.reduce((acc, item) => {
                if (!acc.includes(item.empresa)) acc.push(item.empresa);
                return acc;
            }, [])

            idEmpresas.forEach(x => {
                const info = tablaEmpresas.find(e => e.id_empresas == x)
                if (info) {
                    empresas.push(info)
                }
            });
        }
    res.render('tutor/empresas', { tutorDash: true, itemActivo: 3, empresas })
}
