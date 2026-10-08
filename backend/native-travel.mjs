import {createNativeCollector} from './native-http.mjs';
import {createNativeTransportAdapters} from './native-transport.mjs';
import {createNativeExperienceAdapters} from './native-experiences.mjs';
import {createNativeStayAdapters,nativeStayCatalog} from './native-stays.mjs';

// The HTTP client and parsers run in TravelPro. No remote extraction service or key.
// One collector shares only public robots policies; offer caches belong to each agency.
export function createNativeTravelAdapters({collector=createNativeCollector()}={}){
  return [...createNativeStayAdapters({collector}),...nativeStayCatalog.filter(item=>!item.implemented),...createNativeTransportAdapters({collector}),...createNativeExperienceAdapters({collector})];
}
