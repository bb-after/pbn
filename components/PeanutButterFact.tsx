import { getRandomPeanutFact } from '../utils/peanutfacts';

function PeanutButterFactComponent() {
    const peanutButterFact = getRandomPeanutFact();
    
    return (
        <div>
            <br />
            <b>Did you know?</b>
            <br />
            <div>{peanutButterFact}</div>
        </div>
    );
}

export default PeanutButterFactComponent;
