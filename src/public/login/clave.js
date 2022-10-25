//{{!-- FUNCIÓN PARA COMUNICAR QUE MAYUSCULAS ESTA ACTIVADA --}}
let up = document.getElementById('pass');
let down = document.getElementById('message');     
document.addEventListener('keypress', function(e) {  e = (e) ? e : window.event;
    let charCode = false;
    if (e.which) {
        charCode = e.which;
    } 
    else if (e.keyCode) {
        charCode = e.keyCode;
    }
    let shifton = false;
      
    if (e.shiftKey) {
        shifton = e.shiftKey;
    }
    else if (e.modifiers) {
        shifton = !!(e.modifiers & 4);
    }
    if (charCode >= 97 && charCode <= 122 && shifton) {
        down.innerHTML = "Mayuscula activada";
        return;
    }
    if (charCode >= 65 && charCode <= 90 && !shifton) {
        down.innerHTML = "Mayuscula activada";
        return;
    }
    down.innerHTML = "";
    return;
});    
//{{!-- FIN DE LA FUNCIÓN--}} 

//{{!-- FUNCIÓN PARA VISUALIZAR LA CONTRASEÑA INGRESADA  --}}
jQuery(document).ready(function(){
jQuery('.show-pass').on('click',function(){
jQuery(this).toggleClass('active');
if(jQuery('#pass').attr('type') == 'password'){
    jQuery('#pass').attr('type','text');
}else if(jQuery('#pass').attr('type') == 'text'){
    jQuery('#pass').attr('type','password');
}
});
});
//{{!-- FIN DE LA FUNCIÓN--}} 