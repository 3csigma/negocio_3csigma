(function ($) {
    "use strict"

    /*************************************
     * MODAL PAGAR - ACTIVAR CUENTA
    *************************************/
   const menuLateral = document.querySelector(".pagar-diagnostico");
   const itemAnalisis = document.getElementById("analisis-sin-pagar")

   if (menuLateral) {
        menuLateral.onclick = function () {
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
                        + 'font-weight: 300; border: none;" id="checkout-button">Pagar ahora</button>'
                        + '</form>',
                    showCancelButton: false,
                    showConfirmButton: false,
                })
            } 
        };
    }

    if (itemAnalisis) {
        itemAnalisis.onclick = function () {
            Swal.fire({
                title: 'Análisis de negocio',
                text: 'Aun no hay una propuesta técnica para continuar con esta etapa',
            })
        }
    }

        /*************************************
     * MODAL PAGAR - ACTIVAR CUENTA
    *************************************/
   const menu = document.querySelector("#item-link3");
//    const itemAnalisis = document.getElementById("analisis-sin-pagar")

   if (menu) {
    menu.onclick = function () {
            // const pagoDiagnostico = document.getElementById('diagnosticoPagado').value;
            // const token = document.getElementById('tokenForm').value;
            // console.log(pagoDiagnostico);
            // if (pagoDiagnostico == 0) {
                Swal.fire({
                    title: 'Activa tu cuenta',
                    html: '<p>Por favor realiza el pago del<br>diagnóstico de negocio para continuar</p>'
                        + '<form action="/create-checkout-session" method="POST">'
                        + '<input type="hidden" name="_csrf" value=>'
                        + '<button type="submit" style="background: linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%);'
                        + 'border-radius: 22px;'
                        + 'color: #fff;'
                        + 'width: 150px;'
                        + 'height: 58px;'
                        + 'text-align: center;'
                        + 'padding: 16px;'
                        + 'font-size: 17px;'
                        + 'font-weight: 300; border: none;" id="checkout-button">Pagar ahora</button>'
                        + '</form>',
                    showCancelButton: false,
                    showConfirmButton: false,
                })
            // } 
        };
    }

    if (itemAnalisis) {
        itemAnalisis.onclick = function () {
            Swal.fire({
                title: 'Análisis de negocio',
                text: 'Aun no hay una propuesta técnica para continuar con esta etapa',
            })
        }
    }





})(jQuery);