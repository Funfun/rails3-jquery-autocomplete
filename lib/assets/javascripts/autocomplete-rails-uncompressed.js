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
  var counterMarked = 0, 
      prevKey, 
      skip = 0, 
      prevSkip = -1,
      fromIndex = 0, 
      stopIteration = true,
      menuParentElementPrefix = "suggestions_for_";
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
      var userTypedValue = $(e).val();	
      
      var $div = $("<div></div>")
        .attr('id', menuParentElementPrefix+$(e).attr('id'))
        .attr('input-source-id', $(e).attr('id'));
      $('body').append($div);  
    
      e.delimiter = $(e).attr('data-delimiter') || null;
      
      function split( val ) {
        return val.split( e.delimiter );
      }
      function extractLast( term ) {
        return split( term ).pop().replace(/^\s+/,"");
      }

      /*
       * Used to determine the mirror value. (e.g. in array )
       */
      function mirrorValue( initialValue, mirrorBound ){
        return initialValue == 0 || mirrorBound < initialValue ? 0 : mirrorBound - initialValue;
      };
	              
      function setMarked(_this, value){
        var $parent = _this.parent()
            klass = 'ui-menu-item-marked';
        value ? $parent.addClass(klass) : $parent.removeClass(klass);

        _this.attr('marked', value);
        return false;
      };

      function resetMarkers(jSelector, resetField){
        !resetField && $(e).val(userTypedValue);
        skip = 0;
        counterMarked = 0;
        jSelector.each(function(index){
          setMarked($(this), false);
        });
        return false;
      };		  

      function iterate(item, iterator){
        if( item.attr('marked') == 'true' ){
          item.parent().removeClass('ui-menu-item-marked');
          counterMarked++;
        }
        else {
          $(e).val(item.text());
          return setMarked(item, true);          
        }
                
        if( counterMarked == iterator.length )
          return resetMarkers(iterator);
      };

      function selectItem(iterator, directionSwitched, fromIndex){
        var stopedIndex,
            stopInteration = fromIndex == 0;  
            
        directionSwitched && resetMarkers(iterator);

        iterator.each(function(index){
          stopedIndex = index;              		
          if( index >= mirrorValue(fromIndex, iterator.length) ){
            return iterate($(this), iterator);
          }
        });
	
        return {
          current_index : stopedIndex, 
          iteration : stopInteration };
      };

      function directSelectItem(selector, directionSwitched, fromIndex){
        return selectItem(selector, directionSwitched, fromIndex);
      };

      function reverseSelectItem(selector, directionSwitched, fromIndex){ 
        return selectItem($(selector.get().reverse()), directionSwitched, fromIndex);
      };
      
      function restoreMarkers(){
          resetMarkers($(menuAppendElement + ' ul.ui-menu li a'), true);
      }
      
      var menuAppendElement = '#'+menuParentElementPrefix + $(e).attr('id');
      
      $(e).autocomplete({
        appendTo: menuAppendElement,
        open: function( event, ui ){
          restoreMarkers();
        },
        close: function( event, ui ){
          restoreMarkers();
        },
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
        console.clear();
        var keyCode = $.ui.keyCode,
            $selector = $(menuAppendElement + ' ul.ui-menu li a');
            
        switch( event.keyCode ) {
        case keyCode.PAGE_UP:
          break;
        case keyCode.PAGE_DOWN:
          break;
        case keyCode.UP:
          // prevent moving cursor to beginning of text field in some browsers
          event.preventDefault();  
          var changed = prevKey == keyCode.DOWN;        
          counterMarked = 0;		
          prevSkip = skip;
          fromIndex = changed ? skip : (!stopIteration ? fromIndex : 0);
          item = reverseSelectItem($selector, changed, fromIndex);
          skip = item.current_index;
          if( skip+1 == $selector.length && prevSkip == skip ){
           skip = 0;
           resetMarkers($selector);
          }
          stopIteration = item.iteration;
          skip == 0 && ( stopIteration = true );	
          prevKey = keyCode.UP;
          break;
        case keyCode.DOWN:		
          // prevent moving cursor to end of text field in some browsers
          event.preventDefault();        			
          var changed = prevKey == keyCode.UP;          
          counterMarked = 0;
          prevSkip = skip;          
          fromIndex = changed ? skip : (stopIteration ? 0 : fromIndex);
          item = directSelectItem($selector, changed, fromIndex);
          skip = item.current_index;
          if( skip+1 == $selector.length && prevSkip == skip ){
           skip = 0;
           resetMarkers($selector);
          }         
          stopIteration = item.iteration;
          skip == 0 && ( stopIteration = true );										
          prevKey = keyCode.DOWN;					
          break;
        case keyCode.ENTER:
        case keyCode.NUMPAD_ENTER:
        case keyCode.TAB:
          // #6055 - Opera still allows the keypress to occur
          // which causes forms to submit
          event.preventDefault();        
          // TODO
          // Tigger only when menu is open and has focus
          $(e).autocomplete("close");
          break;
        case keyCode.ESCAPE:
          break;
        default:
          break;
        }
      });
      
      $(".ui-menu-item").live('click', function(event){
        event.preventDefault();	
        var $suggest = $(this);
        
        $(e).each(function(){
          if( $(this).attr('id') == $suggest.parent().parent().attr('input-source-id') ){
            $(this).val($suggest.text());
            $(this).autocomplete("close");
          }
        });
      });
    }
  });
})(jQuery);
