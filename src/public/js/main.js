$(function(){

    let form = $("#wizard");
	$("#wizard").steps({
        headerTag: "h4",
        bodyTag: "section",
        transitionEffect: "fade",
        enableAllSteps: true,
        transitionEffectSpeed: 300,
        labels: {
            next: "Continuar",
            previous: "Anterior",
            finish: 'Enviar Datos'
        },
        onStepChanging: function (event, currentIndex, newIndex) { 
            if ( newIndex >= 1 ) {
                $('.steps ul li:first-child a img').attr('src','/img/step-1.png');
            } else {
                $('.steps ul li:first-child a img').attr('src','/img/step-1-active.png');
            }

            if ( newIndex === 1 ) {
                $('.steps ul li:nth-child(2) a img').attr('src','/img/step-2-active.png');
            } else {
                $('.steps ul li:nth-child(2) a img').attr('src','/img/step-2.png');
            }

            if ( newIndex === 2 ) {
                $('.steps ul li:nth-child(3) a img').attr('src','/img/step-3-active.png');
            } else {
                $('.steps ul li:nth-child(3) a img').attr('src','/img/step-3.png');
            }

            if ( newIndex === 3 ) {
                $('.steps ul li:nth-child(4) a img').attr('src','/img/step-4-active.png');
                $('.actions ul').addClass('step-4');
            } else {
                $('.steps ul li:nth-child(4) a img').attr('src','/img/step-4.png');
                $('.actions ul').removeClass('step-4');
            }
            return true; 
        },
        onFinished: function(event, currentIndex, newIndex) {
            form.submit();
        },
        onStepChanged: function(event, currentIndex, newIndex) {
            return true;
        }
    });
    // Custom Button Jquery Steps
    $('.forward').click(function(){
    	$("#wizard").steps('next');
    })
    $('.backward').click(function(){
        $("#wizard").steps('previous');
    })
    // Click to see password 
    $('.password i').click(function(){
        if ( $('.password input').attr('type') === 'password' ) {
            $(this).next().attr('type', 'text');
        } else {
            $('.password input').attr('type', 'password');
        }
    }) 
    // Create Steps Image
    $('.steps ul li:first-child').append('<img src="/img/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="/img/step-1-active.png" alt=""> ').append('<span class="step-order">Paso 01</span>');
    $('.steps ul li:nth-child(2').append('<img src="/img/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="/img/step-2.png" alt="">').append('<span class="step-order">Paso 02</span>');
    $('.steps ul li:nth-child(3)').append('<img src="/img/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="/img/step-3.png" alt="">').append('<span class="step-order">Paso 03</span>');
    $('.steps ul li:last-child a').append('<img src="/img/step-4.png" alt="">').append('<span class="step-order">Paso 04</span>');
    // Count input 
    $(".quantity span").on("click", function() {

        var $button = $(this);
        var oldValue = $button.parent().find("input").val();

        if ($button.hasClass('plus')) {
          var newVal = parseFloat(oldValue) + 1;
        } else {
           // Don't allow decrementing below zero
          if (oldValue > 0) {
            var newVal = parseFloat(oldValue) - 1;
            } else {
            newVal = 0;
          }
        }
        $button.parent().find("input").val(newVal);
    });
})
