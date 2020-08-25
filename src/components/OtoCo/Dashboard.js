import React from 'react'

// Redux Hook
import {useMappedState,useDispatch} from 'redux-react-hook';
import { useHistory } from "react-router-dom";

// Semantic UI for React
import Button from 'semantic-ui-react/dist/commonjs/elements/Button'
import Container from 'semantic-ui-react/dist/commonjs/elements/Container'


// Smart Contract
import Management from './Dashboard/Management';
import MainContract from './SmartContracts/MainContract';
import SeriesContract from './SmartContracts/SeriesContract';
import Web3Integrate from '../../web3-integrate';

export default () => {

    const dispatch = useDispatch();
    const history = useHistory();

    const {network, currentAccount} = useMappedState(({accountState}) => accountState);
    const {loading, jurisdictionsList, ownSeriesContracts} = useMappedState(({dashboardState}) => dashboardState);
    const {manageSeries} = useMappedState(({managementState}) => managementState);

    const clickBackHandler = async (e) => {
        dispatch({ type: "Resume Welcome Board" });
        history.push('/');
    }

    const clickCopyHandler = (info) => {
        navigator.clipboard.writeText(info);
    }

    const ListItems = () => {
        
        let linkSearch = '';
        if (network === 'kovan') linkSearch = 'https://kovan.etherscan.io/address/';
        if (network === 'main') linkSearch = 'https://etherscan.io/address/';

        const managingIndex = ownSeriesContracts.findIndex(s => s.contract == manageSeries.contract)
        
        const series = ownSeriesContracts.map( (s, idx) =>
            <tr key={idx} className={managingIndex === idx ? 'selected' : ''}>
                <td className="name">{s.name}</td>
                <td><button className="ui mini button jurisdiction">{s.jurisdiction}</button></td>
                <td>{s.created.getUTCDate()}/{s.created.getUTCMonth()+1}/{s.created.getUTCFullYear()} {s.created.getUTCHours()}:{s.created.getUTCMinutes()} UTC</td>
                <td>
                    <a className="primary" href={linkSearch+s.owner} target="blank">{s.owner.substring(0,6)}...</a>
                    <i className="copy link icon" onClick={clickCopyHandler.bind(undefined, s.owner)}></i>
                </td>
                <td>
                    <a className="primary" href={linkSearch+s.contract} target="blank">{s.contract.substring(0,6)}...</a>
                    <i className="copy link icon" onClick={clickCopyHandler.bind(undefined, s.contract)}></i>
                </td>
                <td style={{textAlign:'center'}}>
                    <Button className="primary mini" onClick={dispatch.bind(undefined, { type: "Select Manage Series", series:s })}><i className="cog icon" ></i> Manage</Button>
                </td>
            </tr>
        )

        if (managingIndex >= 0) series.splice(managingIndex+1, 0, <Management/>)

        return series;
    }

    React.useEffect(() => {
        // When enter dashboard page
        setTimeout( async () => {
            if (network === ''){
                await Web3Integrate.callModal();
                let accounts =  await web3.eth.getAccounts();
                // console.log(accounts)
                dispatch({ type: "Set Current Account", currentAccount: accounts[0] });
                dispatch({ type: "Set Current Network", network: await web3.eth.net.getNetworkType() })
            }
            if (history.location.pathname === '/dashboard' && network !== '') {
                let ownSeries = [];
                for (let j of jurisdictionsList){
                    
                    let jurisdictionName = '';
                    if (j == 'us_de') jurisdictionName = 'Delaware';
                    if (j == 'us_wy') jurisdictionName = 'Wyoming';

                    let series = await MainContract.getContract(network, j).methods.mySeries().call({from: currentAccount})// , function(error, series){
                    // console.log(series);
                    for (let s of series) {
                        let newSeries = {
                            jurisdiction: jurisdictionName,
                            contract: s,
                            created: '',
                            name: '',
                            owner: '',
                        }
                        window.testContract = SeriesContract.getContract(s);
                        const events = await SeriesContract.getContract(s).getPastEvents('allEvents',{fromBlock:0,toBlock: 'latest'})
                        const timestamp = await web3.eth.getBlock(events[0].blockNumber);
                        newSeries.created = new Date(timestamp.timestamp * 1000);
                        newSeries.name = await SeriesContract.getContract(s).methods.getName().call({from: currentAccount})
                        newSeries.owner = await SeriesContract.getContract(s).methods.owner().call({from: currentAccount})
                        ownSeries.push(newSeries)
                        //console.log(newSeries);
                    }
                }
                dispatch({ type: "Set Own Series Contracts", ownSeriesContracts:ownSeries });
                dispatch({ type: "Set Dashboard Loading", loading: false });
            } else {
                dispatch({ type: "Set Dashboard Loading", loading: true });
                dispatch({ type: "Clear Manage Series" });
                dispatch({ type: "Set Manage Option", option: 0 });
            }
        }, 0)
    },[network])

    return (
        <Container className="pnl-body">
            <div style={{textAlign: "left", marginBottom: "100px"}}>
                <h1 className="title">Dashboard</h1>
                <p className="subtitle">Here you can manage your companies.</p>
                <p></p>
                <table className="ui celled table" style={{ display: (ownSeriesContracts.length > 0) ? "" : "none"}}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Jurisdiction</th>
                        <th>Creation date</th>
                        <th>Owner</th>
                        <th>Contract</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <ListItems/>
                </tbody>
                </table>
                <div className="ui active centered inline text loader" style={{ display: (loading) ? "" : "none", zIndex : 0 }}>Loading Companies</div>
                <Button id="btn-check-nmae" className="ui right floated button primary" type="submit" onClick={clickBackHandler}>Set up a new company</Button>
            </div>
        </Container>
    )
}
