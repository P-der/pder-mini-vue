import { getCurrentInstance } from "./component";

export function provide(key, value) {
    const currentInstance = getCurrentInstance() as any
    if(currentInstance ){
        let {parent, provides} = currentInstance
        if(parent.provides === provides) {
            provides = currentInstance.provides = Object.create(parent.provides)
        }
        provides[key] = value
    }
}
export function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance() as any
    if(currentInstance) {
        const {parent} = currentInstance
        if(key in parent.provides) {
            return parent.provides[key]
        }
        if(defaultValue) {
            if(typeof defaultValue === 'function') {
                return defaultValue()
            }else {
                return defaultValue
            }
        }
    }
}