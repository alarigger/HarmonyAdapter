from app.model.Cadre import Cadre
from app.integrations.psdreader.PSDReaderConnector import PSDReaderConnector


class CadreDetector():
    
    def parse_cadres(self,psd_path)->list[Cadre]:
        # use pipeline module psdreader 
        return PSDReaderConnector().parse_cadres(psd_path)
        ...

    # wip : alternative parsing cadres with PSDtools
    
    '''
    
    def _get_psd_layers_info(psd_path):
        """
        Retourne un dictionnaire label -> info (scene, x, y) depuis psd-tools.
        Prend en compte les offsets des groupes parents.
        """
        try:
            psd = PSDImage.open(psd_path)
            layers_info = {}
            scene = 0
            
            def process_layer(layer, parent_offset=(0, 0), parent_path=""):
                nonlocal scene
                
                # Calculer le chemin complet du layer
                if parent_path:
                    full_name = f"{parent_path}/{layer.name}"
                else:
                    full_name = layer.name
                
                # Calculer les coordonnées absolues
                abs_x = layer.left + parent_offset[0]
                abs_y = layer.top + parent_offset[1]
                
                # Stocker les infos du layer
                layers_info[full_name] = {
                    "scene": scene,
                    "x": abs_x,
                    "y": abs_y,
                    "width": layer.width,
                    "height": layer.height,
                }
                
                print(f"Layer détecté: {full_name} - scene={scene}, pos=({abs_x}, {abs_y}), size=({layer.width}x{layer.height})")
                
                scene += 1
                
                # Si c'est un groupe, traiter les enfants récursivement
                if hasattr(layer, '__iter__'):
                    for child in layer:
                        process_layer(child, parent_offset=(abs_x, abs_y), parent_path=full_name)
            
            # Parcourir tous les layers de la racine
            for layer in psd:
                process_layer(layer)
            
            print(f"\nTotal layers récupérés: {len(layers_info)}")
            return layers_info
            
        except Exception as e:
            print(f"Erreur lors de la récupération des infos layers avec psd-tools: {e}")
            import traceback
            traceback.print_exc()
            return {}
            
    '''