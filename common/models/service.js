'use strict';


module.exports = function (Service) {

  Service.on('attached',function(){
    Service.app.on('started',function() {
      let modelsServed={};
      for (let modelName in Service.app.models) {
        if (modelsServed[modelName.toLowerCase()]) continue;
        modelsServed[modelName.toLowerCase()]=true;
        const Model=Service.app.models[modelName];

        if (Model.settings.base && Model.settings.base==Service.name) {
          if (!Model.settings.mixins) continue;
          for (let mixin in Model.settings.mixins) {
            if (typeof Service.definition.modelBuilder.mixins.mixins[mixin]!='function')
              continue;
            Service.definition.modelBuilder.mixins.mixins[mixin](Model,Model.settings.mixins[mixin]);

          }
        }
      }
    })
  });

};
