(function ($) {
    "use strict"

    /*************************************
     * MODAL PAGAR - ACTIVAR CUENTA
    *************************************/
    document.querySelector(".pagar-diagnostico").onclick = function () {
        console.log("Paga el diagnóstico")
        const pagoDiagnostico = document.getElementById('diagnosticoPagado').value;
        const token = document.getElementById('tokenForm').value;
        console.log(pagoDiagnostico);
        if (pagoDiagnostico == 0) {
            Swal.fire({
                title: 'Activa tu cuenta',
                html: '<p>Por favor realiza el pago del<br>diagnóstico de negocio para continuar</p>'
                    + '<form action="/create-checkout-session" method="POST">'
                    + '<input type="hidden" name="_csrf" value=' + `${token}` + '>'
                    + '<button type="submit" style="background: linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%);'
                    + 'border-radius: 22px;'
                    + 'color: #fff;'
                    + 'width: 150px;'
                    + 'height: 58px;'
                    + 'text-align: center;'
                    + 'padding: 16px;'
                    + 'font-size: 17px;'
                    + 'font-weight: 300;" id="checkout-button">Pagar ahora</button>'
                    + '</form>',
                showCancelButton: false,
                showConfirmButton: false,
            })
        } 
    };

})(jQuery);