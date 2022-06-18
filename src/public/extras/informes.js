const btnVerInforme = document.getElementById('btnVerInforme');
const btnCargarInforme = document.getElementById('btnInfDiag');
const informeDiag = document.getElementById('informeDiag');

btnCargarInforme.addEventListener("click", function () {
    Swal.fire(
        'Lo sentimos!',
        'Aún no sé ha llenado ningún cuestionario para subir un informe',
        'warning'
    )
});

informeDiag.addEventListener('change', (e) => {
    console.log(e)
});