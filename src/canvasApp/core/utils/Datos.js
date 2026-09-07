class Datos{
    constructor (){
        ////console.log("(Datos.CONSTRUCTOR)!")
        this.dataItems = {};
        this.arrayItems = [];
    }
    get_numItems() {
        return this.arrayItems.length;
    }
    nuevoItem(itemId, item){
        if(this.evalExiste(itemId)){
            //console.log("(Datos.nuevoItem): "+itemId);
            //console.log("ITEM "+itemId+" YA EXISTIA! NO SE HACE NADA.");
        }else{
            this.arrayItems.push(itemId);
            this.dataItems[itemId] = item;
            ////console.log("   arrayItems: "+this.arrayItems);
        }
    }

   quitarItem(itemId) {
        ////console.log("(Datos.quitarItem): "+itemId);
        ////console.log("   this.arrayItems: "+this.arrayItems)
        if(this.evalExiste(itemId)){
            var item = this.dataItems[itemId]
            item = {}
            this.arrayItems = this.quitarElemArray(this.arrayItems, itemId)
        }else{
            //console.log("(Datos.quitarItem): "+itemId);
            //console.log("SE INTENTA QUITAR UN ITEM ("+itemId+") QUE NO EXISTE!")  
        }
        ////console.log("   this.arrayItems': "+this.arrayItems)
    }

    getNextItem(itemId) {
        const posItem = this.arrayItems.indexOf(itemId)
        if(posItem == -1){
            return null
        } else{
            let posNextItem = posItem+1
            if(posNextItem >= this.arrayItems.length){
                posNextItem = 0
            }
            return this.arrayItems[posNextItem]
        }
    }
    getPreviousItem(itemId) {
        const posItem = this.arrayItems.indexOf(itemId)
        if(posItem == -1){
            return null
        } else{
            let posNextItem = posItem-1
            if(posNextItem <0){
                posNextItem = this.arrayItems.length-1
            }
            return this.arrayItems[posNextItem]
        }
    }
    getItem(itemId) {
        ////console.log("(Datos.getItem): "+itemId);
        if(this.evalExiste(itemId)){
            return this.dataItems[itemId];
        }else{
            //console.log("(Datos.getItem): "+itemId);
            //console.log("ITEM "+itemId+" NO EXISTE! SE DEVUELVE UNDEFINED");
            return undefined;
        }
    };
    getItemIndex(itemId) {
        if(this.evalExiste(itemId)){
            return this.arrayItems.indexOf(itemId);
        }else{
            return -1;
        }
    }

    getItemAt(pos) {
        ////console.log("(Datos.getItem): "+itemId);
        if(pos < this.arrayItems.length){
          var itemId = this.arrayItems[pos]
          return this.dataItems[itemId];
        }else{
          //console.log("(Datos.getItemAt): "+pos);
          //console.log("ITEM CON POS"+pos+" NO EXISTE! SE DEVUELVE UNDEFINED");
          return undefined;
        }
      };

    evalExiste(itemId){
        ////console.log("(Datos.evalExiste): "+itemId);
        // for(var i=0; i<this.arrayItems.length; i++){
        //     var valor = this.arrayItems[i];
        //     if(valor == itemId){
        //         return true;
        //     }
        // }
        // return false;
        return this.arrayItems.includes(itemId)
    };

    quitarElemArray(a1, elem) {
		// Dado un array base a1 y un elem, se devuelve un array copia de a1 sin el elemento
        ////console.log("(Datos.quitarElemArray)!");
		var aResultado = []
		for (var i = 0; i<a1.length; i++) {
			var valor = a1[i];
			if (valor != elem) {
				aResultado.push(valorBase);
			}
		}
		return aResultado;
	  }

    randomizar() {
        //console.log("(Datos.randomizar)!");
        //console.log("   this.arrayItems: "+this.arrayItems)
        this.arrayItems = this._shuffleArray(this.arrayItems)
        //console.log("   this.arrayItems': "+this.arrayItems)
    }

    resetear() {
        //console.log("(Datos.resetear)!");
        this.dataItems = {};
        this.arrayItems = [];
    }


    callAll(funcName, params) {
        ////console.log("(Datos.callAll): "+funcName);
        for(var i=0; i<this.arrayItems.length; i++){
          var itemId = this.arrayItems[i]
          var item = this.getItem(itemId)
          if(this._haveData(params)){
            item[funcName](params)
          }else{
            item[funcName]()
          }
        }
    }
    callChildAll(child, funcName, params) {
        ////console.log("(Datos.callAll): "+funcName);
        for(var i=0; i<this.arrayItems.length; i++){
          var itemId = this.arrayItems[i]
          var item = this.getItem(itemId)
          if(this._haveData(params)){
            item[child][funcName](params)
          }else{
            item[child][funcName]()
          }
        }
    }

    callAllExcept(funcName, params, arrayExcept) {
        ////console.log("(Datos.callAllExcept): "+funcName+" except: "+arrayExcept);
        for(var i=0; i<this.arrayItems.length; i++){
          var itemId = this.arrayItems[i]
          ////console.log("itemId: "+itemId)
          if(arrayExcept.indexOf(itemId) != -1){
            // NADA
          }else{
            var item = this.getItem(itemId)
            if(this._haveData(params)){
              item[funcName](params)
            }else{
              item[funcName]()
            }
          }
        }
      }

    callAllList(funcName, params, arrayList) {
        ////console.log("(Datos.callAllList): "+funcName);
        for(var i=0; i<this.arrayItems.length; i++){
          var itemId = this.arrayItems[i]
          if(arrayList.indexOf(itemId) != -1){
            var item = this.getItem(itemId)
            if(this._haveData(params)){
              item[funcName](params)
            }else{
              item[funcName]()
            }
          }else{
            // NADA
          }
        }
    }


    //-------------------
    // PRIVADOS
    _shuffleArray(array1) {
        var array2 = []
        var numElem = array1.length;
        for (var i = 0; i<numElem; i++) {
          var numElemAhora = array1.length;
          var rndElem = Math.ceil(Math.random()*numElemAhora);
          array2.push(array1[rndElem-1]);
          array1.splice(rndElem-1, 1);
        }
        return array2;
    }
  
  
    _haveData(valor){
        if(valor == null || valor == undefined){
            return false
        }else{
            return true
        }
    }
}
export default Datos