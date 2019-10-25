import classic from 'ember-classic-decorator';
import Service, { service as injectService } from '@ember/service';

@classic
export default class InjectingService extends Service {
  @injectService()
  something;

  @injectService('some-thing')
  otherThing;
}
