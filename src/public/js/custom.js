function validarFormRegistro() {
    var switchStatus = false;
    $("#politicas").on('change', function () {
        if ($(this).is(':checked')) {
            switchStatus = $(this).is(':checked');
            alert(switchStatus);// To verify
        }
        else {
            switchStatus = $(this).is(':checked');
            alert(switchStatus);// To verify
        }
    });
}