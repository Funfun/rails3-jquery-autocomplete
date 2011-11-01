/*
* Unobtrusive autocomplete
*
* To use it, you just have to include the HTML attribute autocomplete
* with the autocomplete URL as the value
*
*   Example:
*       <input type="text" data-autocomplete="/url/to/autocomplete">
*
* Optionally, you can use a jQuery selector to specify a field that can
* be updated with the element id whenever you find a matching value
*
*   Example:
*       <input type="text" data-autocomplete="/url/to/autocomplete" data-id-element="#id_field">
*/


$(document).ready(function(){
  $('input[data-autocomplete]').railsAutocomplete();
});

(function(jQuery)
{
  var self = null, 
      firstVisited = true, 
      upToCounter = 0, 
      prevKey, 
      skip = 0, 
      prevSkip = -1,
      fromIndex = 0, 
      stopIteration = true;
  jQuery.fn.railsAutocomplete = function() {
    return this.live('focus',function() {
      if (!this.railsAutoCompleter) {
        this.railsAutoCompleter = new jQuery.railsAutocomplete(this);
      }
    });
  };

  jQuery.railsAutocomplete = function (e) {
    _e = e;
    this.init(_e);
  };

  jQuery.railsAutocomplete.fn = jQuery.railsAutocomplete.prototype = {
    railsAutocomplete: '0.0.1'
  };

  jQuery.railsAutocomplete.fn.extend = jQuery.railsAutocomplete.extend = jQuery.extend;
  jQuery.railsAutocomplete.fn.extend({
    init: function(e) {
      e.delimiter = $(e).attr('data-delimiter') || null;
      function split( val ) {
        return val.split( e.delimiter );
      }
      function extractLast( term ) {
        return split( term ).pop().replace(/^\s+/,"");
      }

      var userTypedValue = $(e).val();	
      /*
       * Used to determine the mirror value. (e.g. in array )
       */
      function mirrorValue( initialValue, mirrorBound ){
        if( initialValue == 0 || mirrorBound < initialValue ){
          return 0;
        }
        else {
          return (mirrorBound - initialValue);
        }
      };
	              
      function setMarked(_this, value){
        var $parent = _this.parent();
        if( value ){
          $parent.addClass('ui-menu-item-marked');
        }
        else{
          $parent.removeClass('ui-menu-item-marked');
        }
        _this.attr('marked', value);
        return false;
      };

      function resetMarkers(jSelector){
        $(e).val(userTypedValue);
        skip = 0;
        jSelector.each(function(index){
          setMarked($(this), false);
        });
        return false;
      };		  

      function iterateWithMarktion(loopItem, iterator){
        var marked = loopItem.attr('marked') != 'true';
        var condition = (firstVisited || marked);

        if( condition ){
          firstVisited ? firstVisited = false : '';
          $(e).val(loopItem.text());
          return setMarked(loopItem, true);
        }
        else {
          loopItem.parent().removeClass('ui-menu-item-marked');
          upToCounter++;
        }

        if( upToCounter == iterator.length ){
          upToCounter = 0;
          return resetMarkers(iterator);
        }		  
      };

      function selectItem(selector, wayToSelect, directioSwitched, fromIndex){
        var self = selector,
            initial_selector = $(selector),
            iterator = initial_selector, 
            iteratorLength,
            stopedIndex,
            directionReverse = wayToSelect == 'reverse';
            stopInteration = true;
			
	      if( fromIndex != 0 ){ 
   	      stopInteration = false; 
	      }			  			
	
	      if( directioSwitched ){
          resetMarkers(iterator);
	      }

	      if( directionReverse ){
  	      iterator = $(initial_selector.get().reverse());				
	      }
	
	      iteratorLength = iterator.length;
	      iterator.each(function(index){
          stopedIndex = index;				 
          if( index >= mirrorValue(fromIndex, iteratorLength) ){
            return iterateWithMarktion($(this), initial_selector);
          }
	      });
	
        return {
          current_index : stopedIndex, 
          iteration : stopInteration,
          iterator_length : iteratorLength};
      };

      function directSelectItem(selector, directioSwitched, fromIndex){
        return selectItem(selector, 'direct', directioSwitched, fromIndex);
      };

      function reverseSelectItem(selector, directioSwitched, fromIndex){
        return selectItem(selector, 'reverse', directioSwitched, fromIndex);
      };
      
      $(e).autocomplete({
        source: function( request, response ) {
          $.getJSON( $(e).attr('data-autocomplete'), {
            term: extractLast( request.term )
          }, function() {
            $(arguments[0]).each(function(i, el) {
              var obj = {};
              obj[el.id] = el;
              $(e).data(obj);
            });
            response.apply(null, arguments);
          });
        },
        search: function() {
          // custom minLength
          var term = extractLast( this.value );
          if ( term.length < 2 ) {
            return false;
          }
        },
        change: function(event, ui){
        },
        
        focus: function() {
          // prevent value inserted on focus
          return false;
        },
        select: function( event, ui ) {
          var terms = split( this.value );
          // remove the current input
          terms.pop();
          // add the selected item
          terms.push( ui.item.value );
          // add placeholder to get the comma-and-space at the end
          if (e.delimiter != null) {
            terms.push( "" );
            this.value = terms.join( e.delimiter );
          } else {
            this.value = terms.join("");
            if ($(this).attr('data-id-element')) {
              $($(this).attr('data-id-element')).val(ui.item.id);
            }
            if ($(this).attr('data-update-elements')) {
              var data = $(this).data(ui.item.id.toString());
              var update_elements = $.parseJSON($(this).attr("data-update-elements"));
              for (var key in update_elements) {
                $(update_elements[key]).val(data[key]);
              }
            }
          }
          var remember_string = this.value;
          $(this).bind('keyup.clearId', function(){
            if($(this).val().trim() != remember_string.trim()){
              $($(this).attr('data-id-element')).val("");
              $(this).unbind('keyup.clearId');
            }
          });
          $(this).trigger('railsAutocomplete.select', ui);

          return false;
        }
      });

		  $(e).keydown(function(event){
		  	var keyCode = $.ui.keyCode;

				switch( event.keyCode ) {
				case keyCode.PAGE_UP:
					break;
				case keyCode.PAGE_DOWN:
					break;
				case keyCode.UP:
					// prevent moving cursor to beginning of text field in some browsers
					upToCounter = 0;		
					prevSkip = skip;								
					fromIndex = prevKey == keyCode.DOWN ? skip : (!stopIteration ? fromIndex : 0);
					item = reverseSelectItem('.ui-menu li a', prevKey == keyCode.DOWN, fromIndex);
					skip = item.current_index;
					stopIteration = item.iteration;
					if( skip == prevSkip ){
						stopIteration = true;	
					}				
					prevKey = keyCode.UP;					
//					console.log("item", item);
//					console.log("fromIndex", fromIndex);
					event.preventDefault();
					break;
				case keyCode.DOWN:					
					upToCounter = 0;
					prevSkip = skip;
					fromIndex = prevKey == keyCode.UP ? skip : (!stopIteration ? fromIndex : 0);
					//console.log("fromIndex", fromIndex);
					item = directSelectItem('.ui-menu li a', prevKey == keyCode.UP, fromIndex);
					skip = item.current_index;
					stopIteration = item.iteration;
					if( skip == prevSkip ){
						stopIteration = true;	
					}										
	  
					// prevent moving cursor to end of text field in some browsers
					prevKey = keyCode.DOWN;					
					//console.log("item", item);					
					event.preventDefault();
					break;
				case keyCode.ENTER:
				case keyCode.NUMPAD_ENTER:
				case keyCode.TAB:
					// TODO
					// Tigger only when menu is open and has focus
					
					$(e).autocomplete("close");
					
					// #6055 - Opera still allows the keypress to occur
					// which causes forms to submit
					event.preventDefault();
					break;
				case keyCode.ESCAPE:
					break;
				default:
					break;
				}
		  });
		  
			$(".ui-menu-item").live('click', function(event){
				event.preventDefault();			
				$(e).val($(this).text());
				$(e).autocomplete("close");
			});
    }
  });
})(jQuery);
