import { prepareGetRequest, preparePostRequest } from "@/util/request-helper";

export async function query_graph_data(csv_json: any) {
    console.log(csv_json);

    const createUserUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/choose_graph_type`);
    const graph_types = ["bar", "line", "scatter"]
    const attributCreate = {
        "csv_json":csv_json,
        "graph_types": graph_types
    };
    const requestParams = preparePostRequest(JSON.stringify(attributCreate));
    try {
        const response = await fetch(createUserUrl, requestParams);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message);
        }
        if (result.error) {
            throw new Error(result.message);
        }
        return result;
    } catch (error) {
        console.error('Error fetching football data:', error);
        throw error;
    }
}

interface ReportSettings {
    title: string;
    logo: {
        url: string;
        position: 'left' | 'right';
    };
    data: {
        headers: string[];
        rows: string[][];
    };
    chart: {
        type: 'bar' | 'line' | 'scatter';
        xAxis: string | undefined;
        yAxis: string | undefined;
    };
}

export async function save_report_settings(report_settings: ReportSettings): Promise<{ message: string }> {
    const saveUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/save_report_settings`);
    const attributCreate = {
        "data":report_settings,
    };
    console.log("!!!!=====attributCreate", attributCreate);
    const requestParams = preparePostRequest(JSON.stringify(attributCreate));
    try {
        const response = await fetch(saveUrl, requestParams);
        const result = await response.json();
        console.log("!!!!=====result", result);
        if (!response.ok) {
            throw new Error(result.message);
        }
        if (result.error) {
            throw new Error(result.message);
        }
        return result;
    } catch (error) {
        console.error('Error saving report settings:', error);
        throw error;
    }
}


