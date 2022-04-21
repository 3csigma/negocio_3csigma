(function ($) {
    "use strict"

/*************************************
 * MODAL PAGAR - ACTIVAR CUENTA
*************************************/


/*******************
Sweet-alert JS 
*******************/
    document.querySelector(".pagar-cuenta").onclick = function () {
        const noPago = document.getElementById('noPago').value;
        console.log(noPago);
        if (noPago) {
            Swal.fire({
                title: 'Activa tu cuenta',
                text: 'Por favor realiza el pago del diagnóstico de negocio para continuar',
                html: '<a class="btn btn-primary" data-bs-toggle="modal" href="#exampleModalToggle" role="button">Open first modal</a>',
                showCancelButton: false,
                confirmButtonColor: '#50368C',
                confirmButtonText: 'Pagar ahora',
            })
        }
    }
    document.querySelector(".pagar-diagnostico").onclick = function () {
        const noPago = document.getElementById('noPago').value;
        const token = document.getElementById('tokenForm').value;;
        console.log(noPago);
        if (noPago) {
            Swal.fire({
                title: 'Activa tu cuenta',
                html:  '<p>Por favor realiza el pago del<br>diagnóstico de negocio para continuar</p>'
                    +'<form action="/create-checkout-session" method="POST">'
                    +'<input type="hidden" name="_csrf" value='+`${token}`+'>'
                    +'<button type="submit" style="background: linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%);'
                    +'border-radius: 22px;'
                    +'color: #fff;'
                    +'width: 150px;'
                    +'height: 58px;'
                    +'text-align: center;'
                    +'padding: 16px;'
                    +'font-size: 17px;'
                    +'font-weight: 300;" id="checkout-button">Pagar ahora</button>'
                    +'</form>',
                showCancelButton: false,
                showConfirmButton: false,
            })
        }
    };

})(jQuery);