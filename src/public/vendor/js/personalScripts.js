(function ($) {
    "use strict"

/*******************
Sweet-alert JS 
*******************/

    document.querySelector(".pagar-diagnostico").onclick = function () {
        const noPago = document.getElementById('noPago').value;
        console.log(noPago);
        if (noPago) {
            Swal.fire({
                title: 'Activa tu cuenta',
                text: 'Por favor realiza el pago del diagnóstico de negocio para continuar',
                showCancelButton: false,
                confirmButtonColor: '#50368C',
                confirmButtonText: 'Pagar ahora',
            })
        }
    },
    document.querySelector(".no-pago-diagnostico").onclick = function () {
        const noPago = document.getElementById('noPago').value;
        console.log(noPago);
        if (noPago) {
            Swal.fire({
                title: 'Activa tu cuenta',
                text: 'Por favor realiza el pago del diagnóstico de negocio para continuar',
                showCancelButton: false,
                confirmButtonColor: '#50368C',
                confirmButtonText: 'Pagar ahora',
            })
        }
    };

})(jQuery);